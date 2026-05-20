(function () {
  const CLIPBOARD_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg>`;

  const CHECKMARK_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>`;

  const addCopyButtons = () => {
    document.querySelectorAll('.prose pre').forEach((preElement) => {
      const wrapperElement = document.createElement('div');
      wrapperElement.className = 'code-block-wrapper';
      preElement.parentNode.insertBefore(wrapperElement, preElement);
      wrapperElement.appendChild(preElement);
      preElement.style.marginBottom = '0';

      const copyButton = document.createElement('button');
      copyButton.className = 'copy-code-button';
      copyButton.setAttribute('aria-label', 'Copy code to clipboard');
      copyButton.innerHTML = CLIPBOARD_ICON;
      wrapperElement.appendChild(copyButton);

      copyButton.addEventListener('click', () => {
        const codeElement = preElement.querySelector('code');
        const codeText = (codeElement ?? preElement).textContent;

        navigator.clipboard.writeText(codeText).then(() => {
          copyButton.innerHTML = CHECKMARK_ICON;
          copyButton.classList.add('is-copied');
          setTimeout(() => {
            copyButton.innerHTML = CLIPBOARD_ICON;
            copyButton.classList.remove('is-copied');
          }, 2000);
        });
      });
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addCopyButtons);
  } else {
    addCopyButtons();
  }
})();
