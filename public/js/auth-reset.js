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
  const toastContainer = document.getElementById('toastContainer');

  if (!modal || !openBtn || !emailStep || !codeStep || !passwordStep) return;

  const state = {
    email: '',
    code: '0000'
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
    state.code = '0000';
    setStep('email');
  }

  openBtn.addEventListener('click', openModal);
  closeBtn?.addEventListener('click', closeModal);

  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeModal();
  });

  modal.querySelectorAll('[data-reset-back]').forEach((button) => {
    button.addEventListener('click', () => setStep(button.dataset.resetBack));
  });

  emailStep.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = emailInput.value.trim().toLowerCase();

    try {
      const { ok, status, data } = await requestJSON('/auth/forgot-password/start', jsonOptions('POST', { email }));
      if (!ok) {
        const errorState = resolveResetError(status, data, 'Не удалось начать восстановление пароля');
        return showToast(errorState.message, 'error', errorState.titleText);
      }

      state.email = email;
      showToast(data.message || 'Код подтверждения подготовлен', 'success', 'Почта найдена');
      setStep('code');
      codeInput.focus();
    } catch (error) {
      showToast('Не удалось начать восстановление пароля. Проверьте, что сервер перезапущен после обновления.', 'error', 'Ошибка');
    }
  });

  codeStep.addEventListener('submit', async (event) => {
    event.preventDefault();
    const code = codeInput.value.trim();

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
      showToast('Код подтвержден, можно задать новый пароль', 'success', 'Подтверждено');
      setStep('password');
      passwordInput.focus();
    } catch (error) {
      showToast('Не удалось проверить код. Проверьте, что сервер запущен.', 'error', 'Ошибка');
    }
  });

  passwordStep.addEventListener('submit', async (event) => {
    event.preventDefault();
    const password = passwordInput.value;
    const passwordRepeat = passwordRepeatInput.value;

    if (password !== passwordRepeat) {
      return showToast('Пароли не совпадают', 'warning', 'Проверьте ввод');
    }

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
    }
  });
});
