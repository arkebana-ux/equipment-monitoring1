document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('passwordResetModal');
  const openBtn = document.getElementById('forgotPasswordBtn');
  const closeBtn = document.getElementById('closePasswordResetModal');
  const title = document.getElementById('passwordResetTitle');
  const emailStep = document.getElementById('passwordResetEmailStep');
  const codeStep = document.getElementById('passwordResetCodeStep');
  const passwordStep = document.getElementById('passwordResetPasswordStep');
  const emailInput = document.getElementById('passwordResetEmail');
  const codeInput = document.getElementById('passwordResetCode');
  const passwordInput = document.getElementById('passwordResetNewPassword');
  const passwordRepeatInput = document.getElementById('passwordResetRepeatPassword');
  const codeHint = codeStep?.querySelector('.hint');
  const toastContainer = document.getElementById('toastContainer');

  if (!modal || !openBtn || !emailStep || !codeStep || !passwordStep) return;

  const state = {
    email: '',
    code: '',
    busy: false,
    sendingCode: false
  };

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  async function requestJSON(url, options = {}) {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, status: response.status, data };
  }

  function jsonOptions(method, payload) {
    return {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    };
  }

  function resolveResetError(status, data, fallbackMessage) {
    if (status === 404 && !data?.message) {
      return {
        titleText: 'Нужно обновление',
        message: 'Сервер работает на старой версии. Перезапустите приложение и повторите попытку.'
      };
    }

    return {
      titleText: 'Ошибка',
      message: data?.message || fallbackMessage
    };
  }

  function showToast(message, type = 'success', titleText = 'Готово') {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<p class="toast-title">${escapeHtml(titleText)}</p><p class="toast-message">${escapeHtml(message)}</p>`;
    toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 3400);
  }

  function setStep(step) {
    emailStep.classList.toggle('hidden', step !== 'email');
    codeStep.classList.toggle('hidden', step !== 'code');
    passwordStep.classList.toggle('hidden', step !== 'password');

    if (step === 'email') title.textContent = 'Введите электронную почту';
    if (step === 'code') title.textContent = 'Введите код подтверждения';
    if (step === 'password') title.textContent = 'Введите новый пароль';
  }

  function setBusy(form, busy, busyText) {
    state.busy = busy;
    const submitButton = form?.querySelector('button[type="submit"]');
    if (!submitButton) return;
    if (!submitButton.dataset.defaultText) {
      submitButton.dataset.defaultText = submitButton.textContent;
    }
    submitButton.disabled = busy;
    submitButton.textContent = busy ? busyText : submitButton.dataset.defaultText;
  }

  function setCodeStepPending(isPending) {
    state.sendingCode = isPending;
    codeInput.disabled = isPending;
    const submitButton = codeStep.querySelector('button[type="submit"]');
    const backButton = codeStep.querySelector('[data-reset-back="email"]');
    if (submitButton) submitButton.disabled = isPending;
    if (backButton) backButton.disabled = isPending;
    if (codeHint) {
      codeHint.textContent = isPending
        ? 'Отправляем письмо с кодом. Обычно это занимает несколько секунд.'
        : 'Проверьте почтовый ящик и введите код из письма.';
    }
  }

  function openModal() {
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    setStep('email');
    emailInput.focus();
  }

  function closeModal() {
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
    emailStep.reset();
    codeStep.reset();
    passwordStep.reset();
    state.email = '';
    state.code = '';
    state.busy = false;
    state.sendingCode = false;
    setBusy(emailStep, false, '');
    setBusy(codeStep, false, '');
    setBusy(passwordStep, false, '');
    setCodeStepPending(false);
    setStep('email');
  }

  openBtn.addEventListener('click', openModal);
  closeBtn?.addEventListener('click', closeModal);

  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeModal();
  });

  modal.querySelectorAll('[data-reset-back]').forEach((button) => {
    button.addEventListener('click', () => {
      if (!state.busy && !state.sendingCode) setStep(button.dataset.resetBack);
    });
  });

  emailStep.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (state.busy) return;

    const email = emailInput.value.trim().toLowerCase();
    state.email = email;
    setBusy(emailStep, true, 'Отправляем код...');
    setStep('code');
    setCodeStepPending(true);

    try {
      const { ok, status, data } = await requestJSON('/auth/forgot-password/start', jsonOptions('POST', { email }));
      if (!ok) {
        setStep('email');
        emailInput.focus();
        const errorState = resolveResetError(status, data, 'Не удалось начать восстановление пароля');
        return showToast(errorState.message, 'error', errorState.titleText);
      }

      showToast(data.message || 'Код подтверждения отправлен', 'success', 'Письмо отправлено');
      codeInput.focus();
    } catch (error) {
      setStep('email');
      emailInput.focus();
      showToast('Не удалось начать восстановление пароля. Проверьте, что сервер перезапущен после обновления.', 'error', 'Ошибка');
    } finally {
      setBusy(emailStep, false, 'Отправляем код...');
      setCodeStepPending(false);
    }
  });

  codeStep.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (state.busy || state.sendingCode) return;

    const code = codeInput.value.trim();
    setBusy(codeStep, true, 'Проверяем код...');

    try {
      const { ok, status, data } = await requestJSON('/auth/forgot-password/verify', jsonOptions('POST', {
        email: state.email,
        code
      }));
      if (!ok) {
        const errorState = resolveResetError(status, data, 'Неверный код');
        return showToast(errorState.message, 'error', errorState.titleText);
      }

      state.code = code;
      setStep('password');
      showToast('Код подтвержден, можно задать новый пароль', 'success', 'Подтверждено');
      passwordInput.focus();
    } catch (error) {
      showToast('Не удалось проверить код. Проверьте, что сервер запущен.', 'error', 'Ошибка');
    } finally {
      setBusy(codeStep, false, 'Проверяем код...');
    }
  });

  passwordStep.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (state.busy) return;

    const password = passwordInput.value;
    const passwordRepeat = passwordRepeatInput.value;

    if (password !== passwordRepeat) {
      return showToast('Пароли не совпадают', 'warning', 'Проверьте ввод');
    }

    setBusy(passwordStep, true, 'Сохраняем пароль...');

    try {
      const { ok, status, data } = await requestJSON('/auth/forgot-password/reset', jsonOptions('POST', {
        email: state.email,
        code: state.code,
        password
      }));
      if (!ok) {
        const errorState = resolveResetError(status, data, 'Не удалось обновить пароль');
        return showToast(errorState.message, 'error', errorState.titleText);
      }

      showToast('Пароль обновлен. Теперь можно войти с новым паролем.', 'success', 'Готово');
      closeModal();
    } catch (error) {
      showToast('Не удалось обновить пароль. Проверьте, что сервер запущен.', 'error', 'Ошибка');
    } finally {
      setBusy(passwordStep, false, 'Сохраняем пароль...');
    }
  });
});
