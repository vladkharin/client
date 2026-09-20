"use client";

import { ChangeEvent, FormEvent, useState, useEffect, useRef } from "react";
import styles from "./page.module.css";
import { FORM_REGISTRATION, RESPONSE_AUTHORIZATION } from "@/types/types";
import { registration, authorization, verifyEmail, resendVerification } from "@/API/routes";
import { useSocketStore, useUserStore } from "@/store";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegistrationPage() {
  const router = useRouter();
  const { login } = useUserStore();

  const [step, setStep] = useState<"form" | "verify">("form");

  const [formState, setFormState] = useState<FORM_REGISTRATION>({
    name: "",
    surname: "",
    username: "",
    email: "",
    password: "",
    password_confirmed: "",
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Verification step state
  const [codeDigits, setCodeDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const digitInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Password strength calculation
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, text: "", color: "" };
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 1) return { score: 1, text: "Очень простой", color: "#ef4444" };
    if (score === 2) return { score: 2, text: "Простой", color: "#f97316" };
    if (score === 3 || score === 4) return { score: 3, text: "Хороший", color: "#eab308" };
    return { score: 4, text: "Надежный", color: "#22c55e" };
  };

  const passwordStrength = getPasswordStrength(formState.password);

  // Resend countdown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === "verify" && resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, resendCooldown]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
    setGeneralError(null);
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setGeneralError(null);
    const errors: Record<string, string> = {};

    if (formState.password !== formState.password_confirmed) {
      errors.password_confirmed = "Пароли не совпадают";
    }

    if (formState.password.length < 6) {
      errors.password = "Пароль должен содержать минимум 6 символов";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsLoading(true);

    try {
      const { password_confirmed: _password_confirmed, ...dataToSend } = formState;

      // 1. Отправляем запрос на регистрацию
      await registration(JSON.stringify(dataToSend));

      // 2. Переходим к подтверждению Email
      setStep("verify");
      setResendCooldown(60);
      setCanResend(false);
      setSuccessInfo(`Код подтверждения отправлен на ${formState.email}`);
      setTimeout(() => {
        digitInputsRef.current[0]?.focus();
      }, 100);
    } catch (err: any) {
      const msg = err?.message || "Произошла ошибка при регистрации";
      setGeneralError(msg);
      if (msg.toLowerCase().includes("никнейм")) {
        setFieldErrors((prev) => ({ ...prev, username: msg }));
      } else if (msg.toLowerCase().includes("email") || msg.toLowerCase().includes("почт")) {
        setFieldErrors((prev) => ({ ...prev, email: msg }));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDigitChange = (index: number, val: string) => {
    const cleanVal = val.replace(/\D/g, "");
    if (!cleanVal && val !== "") return;

    const newDigits = [...codeDigits];

    if (cleanVal.length > 1) {
      // Handle paste
      const pasted = cleanVal.slice(0, 6).split("");
      pasted.forEach((d, i) => {
        if (i < 6) newDigits[i] = d;
      });
      setCodeDigits(newDigits);
      const nextIdx = Math.min(pasted.length, 5);
      digitInputsRef.current[nextIdx]?.focus();
      if (pasted.length === 6) {
        submitVerification(newDigits.join(""));
      }
      return;
    }

    newDigits[index] = cleanVal;
    setCodeDigits(newDigits);

    if (cleanVal && index < 5) {
      digitInputsRef.current[index + 1]?.focus();
    }

    if (newDigits.every((d) => d.length === 1)) {
      submitVerification(newDigits.join(""));
    }
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !codeDigits[index] && index > 0) {
      digitInputsRef.current[index - 1]?.focus();
    }
  };

  const submitVerification = async (codeToVerify?: string) => {
    const fullCode = codeToVerify || codeDigits.join("");
    if (fullCode.length !== 6) {
      setGeneralError("Введите 6-значный код полностью");
      return;
    }

    setIsVerifying(true);
    setGeneralError(null);

    try {
      await verifyEmail(formState.email, fullCode);

      // Автологин после успешного подтверждения
      const authData = {
        username: formState.username,
        password: formState.password,
      };

      const response: RESPONSE_AUTHORIZATION = await authorization(JSON.stringify(authData));
      login(response.access_token, response.id);

      useSocketStore.getState().connect(response.access_token, () => {
        router.push("/main");
      });
    } catch (err: any) {
      setGeneralError(err?.message || "Неверный или просроченный код");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendCode = async () => {
    if (!canResend || isResending) return;
    setIsResending(true);
    setGeneralError(null);

    try {
      await resendVerification(formState.email);
      setSuccessInfo(`Новый код отправлен на ${formState.email}`);
      setResendCooldown(60);
      setCanResend(false);
      setCodeDigits(["", "", "", "", "", ""]);
      digitInputsRef.current[0]?.focus();
    } catch (err: any) {
      setGeneralError(err?.message || "Не удалось отправить код повторно");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <section className={styles.section}>
      <Link href="/" className={styles.logo_link}>
        <div className={styles.logo_container}>
          <div className={styles.logo_icon}>✨</div>
          <h1 className={styles.logo_title}>
            craft<span>Hive</span>
          </h1>
        </div>
      </Link>

      <div className={styles.wrapper}>
        {generalError && (
          <div className={styles.error_banner}>
            <span className={styles.error_banner_icon}>⚠️</span>
            <span>{generalError}</span>
          </div>
        )}

        {successInfo && !generalError && (
          <div className={styles.success_banner}>
            <span>✉️ {successInfo}</span>
          </div>
        )}

        {step === "form" ? (
          <>
            <div className={styles.header}>
              <h2 className={styles.title}>Создать аккаунт</h2>
              <p className={styles.subtitle}>Присоединяйтесь к сообществу CraftHive</p>
            </div>

            <form className={styles.form} onSubmit={handleFormSubmit} noValidate>
              <div className={styles.row}>
                <div className={styles.input_area}>
                  <label htmlFor="reg-name" className={styles.label}>
                    Имя
                  </label>
                  <input
                    id="reg-name"
                    className={`${styles.input} ${fieldErrors.name ? styles.input_error : ""}`}
                    type="text"
                    name="name"
                    autoComplete="given-name"
                    placeholder="Иван"
                    value={formState.name}
                    onChange={handleChange}
                    required
                  />
                  {fieldErrors.name && <p className={styles.error_text}>{fieldErrors.name}</p>}
                </div>

                <div className={styles.input_area}>
                  <label htmlFor="reg-surname" className={styles.label}>
                    Фамилия
                  </label>
                  <input
                    id="reg-surname"
                    className={`${styles.input} ${fieldErrors.surname ? styles.input_error : ""}`}
                    type="text"
                    name="surname"
                    autoComplete="family-name"
                    placeholder="Иванов"
                    value={formState.surname}
                    onChange={handleChange}
                    required
                  />
                  {fieldErrors.surname && <p className={styles.error_text}>{fieldErrors.surname}</p>}
                </div>
              </div>

              <div className={styles.input_area}>
                <label htmlFor="reg-username" className={styles.label}>
                  Никнейм
                </label>
                <div className={styles.input_prefix_wrapper}>
                  <span className={styles.input_prefix}>@</span>
                  <input
                    id="reg-username"
                    className={`${styles.input} ${styles.input_with_prefix} ${fieldErrors.username ? styles.input_error : ""}`}
                    type="text"
                    name="username"
                    autoComplete="username"
                    placeholder="username"
                    value={formState.username}
                    onChange={handleChange}
                    required
                  />
                </div>
                {fieldErrors.username && <p className={styles.error_text}>{fieldErrors.username}</p>}
              </div>

              <div className={styles.input_area}>
                <label htmlFor="reg-email" className={styles.label}>
                  Электронная почта
                </label>
                <input
                  id="reg-email"
                  className={`${styles.input} ${fieldErrors.email ? styles.input_error : ""}`}
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder="example@mail.ru"
                  value={formState.email}
                  onChange={handleChange}
                  required
                />
                {fieldErrors.email && <p className={styles.error_text}>{fieldErrors.email}</p>}
              </div>

              <div className={styles.input_area}>
                <label htmlFor="reg-password" className={styles.label}>
                  Пароль
                </label>
                <input
                  id="reg-password"
                  className={`${styles.input} ${fieldErrors.password ? styles.input_error : ""}`}
                  type="password"
                  name="password"
                  autoComplete="new-password"
                  placeholder="Минимум 6 символов"
                  value={formState.password}
                  onChange={handleChange}
                  required
                />
                {formState.password && (
                  <div className={styles.strength_bar_container}>
                    <div className={styles.strength_bars}>
                      {[1, 2, 3, 4].map((bar) => (
                        <div
                          key={bar}
                          className={styles.strength_bar}
                          style={{
                            backgroundColor:
                              passwordStrength.score >= bar ? passwordStrength.color : "rgba(255, 255, 255, 0.1)",
                          }}
                        />
                      ))}
                    </div>
                    <span className={styles.strength_text} style={{ color: passwordStrength.color }}>
                      {passwordStrength.text}
                    </span>
                  </div>
                )}
                {fieldErrors.password && <p className={styles.error_text}>{fieldErrors.password}</p>}
              </div>

              <div className={styles.input_area}>
                <label htmlFor="reg-password-confirm" className={styles.label}>
                  Повторите пароль
                </label>
                <input
                  id="reg-password-confirm"
                  className={`${styles.input} ${fieldErrors.password_confirmed ? styles.input_error : ""}`}
                  type="password"
                  name="password_confirmed"
                  autoComplete="new-password"
                  placeholder="Повторите пароль"
                  value={formState.password_confirmed}
                  onChange={handleChange}
                  required
                />
                {fieldErrors.password_confirmed && (
                  <p className={styles.error_text}>{fieldErrors.password_confirmed}</p>
                )}
              </div>

              <button className={styles.submit_btn} type="submit" disabled={isLoading}>
                {isLoading ? (
                  <span className={styles.btn_spinner_content}>
                    <span className={styles.spinner} /> Отправка...
                  </span>
                ) : (
                  "Зарегистрироваться"
                )}
              </button>

              <p className={styles.footer_text}>
                Уже зарегистрированы?{" "}
                <Link href="/authorization" className={styles.link}>
                  Войти в аккаунт
                </Link>
              </p>
            </form>
          </>
        ) : (
          <div className={styles.verify_step}>
            <div className={styles.header}>
              <div className={styles.verify_icon}>📬</div>
              <h2 className={styles.title}>Подтверждение Email</h2>
              <p className={styles.subtitle}>
                Мы отправили 6-значный код на почту <br />
                <strong className={styles.highlight_email}>{formState.email}</strong>
              </p>
            </div>

            <div className={styles.digits_container}>
              {codeDigits.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    digitInputsRef.current[index] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  className={styles.digit_input}
                  value={digit}
                  onChange={(e) => handleDigitChange(index, e.target.value)}
                  onKeyDown={(e) => handleDigitKeyDown(index, e)}
                  autoFocus={index === 0}
                  autoComplete="one-time-code"
                />
              ))}
            </div>

            <button
              className={styles.submit_btn}
              onClick={() => submitVerification()}
              disabled={isVerifying || codeDigits.some((d) => !d)}
            >
              {isVerifying ? (
                <span className={styles.btn_spinner_content}>
                  <span className={styles.spinner} /> Проверка кода...
                </span>
              ) : (
                "Подтвердить и войти"
              )}
            </button>

            <div className={styles.resend_section}>
              {canResend ? (
                <button
                  type="button"
                  className={styles.resend_btn}
                  onClick={handleResendCode}
                  disabled={isResending}
                >
                  {isResending ? "Отправка..." : "Отправить код повторно"}
                </button>
              ) : (
                <p className={styles.timer_text}>
                  Отправить код повторно через <span className={styles.timer_count}>{resendCooldown}с</span>
                </p>
              )}
            </div>

            <button
              type="button"
              className={styles.back_btn}
              onClick={() => {
                setStep("form");
                setGeneralError(null);
                setSuccessInfo(null);
              }}
            >
              ← Изменить данные / почту
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
