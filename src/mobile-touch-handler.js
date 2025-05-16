/**
 * mobile-touch-handler.js
 * Utilitários para melhor experiência de toque em dispositivos móveis
 */

// Facilitar o uso de gestos de swipe para navegação em dispositivos móveis
export function setupSwipeNavigation(containerSelector, callback) {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  let touchStartX = 0;
  let touchEndX = 0;
  const minSwipeDistance = 80; // Distância mínima para considerar um swipe válido

  // Detectar início do toque
  container.addEventListener(
    "touchstart",
    (e) => {
      touchStartX = e.changedTouches[0].screenX;
    },
    { passive: true }
  );

  // Detectar fim do toque e determinar se houve swipe
  container.addEventListener(
    "touchend",
    (e) => {
      touchEndX = e.changedTouches[0].screenX;
      handleSwipe();
    },
    { passive: true }
  );

  // Processar o swipe
  function handleSwipe() {
    if (touchEndX < touchStartX - minSwipeDistance) {
      // Swipe para a esquerda (próxima aba)
      callback("next");
    } else if (touchEndX > touchStartX + minSwipeDistance) {
      // Swipe para a direita (aba anterior)
      callback("prev");
    }
  }
}

// Ajustar scroll horizontal para navegação com abas
export function setupScrollSnapping(containerSelector) {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  // Fazer o elemento ativo ficar sempre visível com scroll automático
  const updateScroll = () => {
    const activeTab = container.querySelector(".active");
    if (activeTab) {
      // Calcular a posição de deslocamento para centralizar o elemento ativo
      const scrollLeft =
        activeTab.offsetLeft -
        container.clientWidth / 2 +
        activeTab.clientWidth / 2;

      // Aplicar o scroll suavemente
      container.scrollTo({
        left: scrollLeft,
        behavior: "smooth",
      });
    }
  };

  // Observar mudanças na classe para detectar quando um novo item se torna ativo
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.attributeName === "class") {
        updateScroll();
      }
    });
  });

  // Configurar o observador para todos os botões no container
  const buttons = container.querySelectorAll("button");
  buttons.forEach((button) => {
    observer.observe(button, { attributes: true });
  });

  // Inicializar o scroll após o carregamento da página
  setTimeout(updateScroll, 100);
}

// Adicionar comportamento de toque para melhorar a experiência em dispositivos móveis
export function enhanceTouchExperience() {
  // Adicionar classe mobile quando detectar uso em dispositivos móveis
  const isMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  if (isMobile) {
    document.body.classList.add("mobile-device");

    // Fast-click fix para evitar atraso de 300ms em interações de toque
    document.addEventListener("touchstart", function () {}, { passive: true });
  }
}
