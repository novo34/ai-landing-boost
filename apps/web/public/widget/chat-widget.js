/**
 * AI Landing Boost - Chat Widget
 * Widget embebible de chat para sitios web
 *
 * Uso:
 * <script src="https://tu-dominio.com/widget/chat-widget.js" data-tenant-slug="mi-tenant"></script>
 */

(function () {
  "use strict";

  // Configuración por defecto
  const DEFAULT_CONFIG = {
    apiUrl: window.NEXT_PUBLIC_API_URL || "http://localhost:3001",
    primaryColor: "#007bff",
    position: "bottom-right",
    welcomeMessage: "¡Hola! ¿En qué puedo ayudarte?",
    placeholder: "Escribe tu mensaje...",
  };

  // Estado del widget
  let widgetState = {
    isOpen: false,
    isLoaded: false,
    config: null,
    branding: {
      logoUrl: null,
      primaryColor: null,
      secondaryColor: null,
    },
    conversationId: null,
    participantId: null,
    messages: [],
    tenantSlug: null,
  };

  // Obtener tenant slug del script
  function getTenantSlug() {
    const script = document.querySelector("script[data-tenant-slug]");
    return script ? script.getAttribute("data-tenant-slug") : null;
  }

  // Cargar configuración del widget
  async function loadConfig() {
    const tenantSlug = getTenantSlug();
    if (!tenantSlug) {
      console.error("Chat Widget: tenant-slug no especificado");
      return;
    }

    widgetState.tenantSlug = tenantSlug;

    try {
      const response = await fetch(
        `${DEFAULT_CONFIG.apiUrl}/api/public/webchat/config/${tenantSlug}`
      );
      const result = await response.json();

      if (result.success) {
        widgetState.config = { ...DEFAULT_CONFIG, ...result.data.config };

        // Guardar branding del tenant
        widgetState.branding = result.data.branding || {
          logoUrl: null,
          primaryColor: null,
          secondaryColor: null,
        };

        // Usar color primario del branding si está disponible (sobrescribe config del canal)
        if (widgetState.branding.primaryColor) {
          widgetState.config.primaryColor = widgetState.branding.primaryColor;
        }

        widgetState.isLoaded = true;
        initWidget();
      } else {
        console.error("Chat Widget: Error al cargar configuración", result);
      }
    } catch (error) {
      console.error("Chat Widget: Error al cargar configuración", error);
      // Usar configuración por defecto
      widgetState.config = DEFAULT_CONFIG;
      widgetState.branding = {
        logoUrl: null,
        primaryColor: null,
        secondaryColor: null,
      };
      widgetState.isLoaded = true;
      initWidget();
    }
  }

  // Inicializar widget
  function initWidget() {
    if (!widgetState.isLoaded) return;

    // Crear estilos
    injectStyles();

    // Crear HTML del widget
    createWidgetHTML();

    // Cargar mensajes si hay conversación
    if (widgetState.conversationId) {
      loadMessages();
    }
  }

  // Inyectar estilos CSS
  function injectStyles() {
    const styleId = "chat-widget-styles";
    if (document.getElementById(styleId)) return;

    // Usar color primario del branding si está disponible, sino del config, sino default
    const primaryColor =
      widgetState.branding?.primaryColor ||
      widgetState.config?.primaryColor ||
      DEFAULT_CONFIG.primaryColor;

    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      .chat-widget-container {
        position: fixed;
        z-index: 9999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      }
      .chat-widget-button {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: ${primaryColor};
        border: none;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 24px;
        transition: transform 0.2s;
      }
      .chat-widget-button:hover {
        transform: scale(1.1);
      }
      .chat-widget-button:active {
        transform: scale(0.95);
      }
      .chat-widget-window {
        position: absolute;
        width: 350px;
        height: 500px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.2);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        ${getPositionStyles()}
      }
      .chat-widget-header {
        background: ${primaryColor};
        color: white;
        padding: 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .chat-widget-header h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
      }
      .chat-widget-header img {
        max-height: 30px;
        max-width: 150px;
        object-fit: contain;
      }
      .chat-widget-close {
        background: none;
        border: none;
        color: white;
        font-size: 20px;
        cursor: pointer;
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .chat-widget-messages {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .chat-widget-message {
        max-width: 80%;
        padding: 10px 14px;
        border-radius: 12px;
        word-wrap: break-word;
      }
      .chat-widget-message.inbound {
        background: #f1f3f5;
        align-self: flex-start;
      }
      .chat-widget-message.outbound {
        background: ${primaryColor};
        color: white;
        align-self: flex-end;
      }
      .chat-widget-input-container {
        padding: 16px;
        border-top: 1px solid #e9ecef;
        display: flex;
        gap: 8px;
      }
      .chat-widget-input {
        flex: 1;
        padding: 10px 14px;
        border: 1px solid #dee2e6;
        border-radius: 20px;
        font-size: 14px;
        outline: none;
      }
      .chat-widget-input:focus {
        border-color: ${primaryColor};
      }
      .chat-widget-send {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: ${primaryColor};
        border: none;
        color: white;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
      }
      .chat-widget-send:hover {
        opacity: 0.9;
      }
      .chat-widget-send:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      @media (max-width: 480px) {
        .chat-widget-window {
          width: 100vw;
          height: 100vh;
          border-radius: 0;
          ${getPositionStyles(true)}
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Obtener estilos de posición
  function getPositionStyles(fullscreen = false) {
    if (fullscreen) {
      return "bottom: 0; right: 0;";
    }
    const position = widgetState.config.position || "bottom-right";
    switch (position) {
      case "bottom-left":
        return "bottom: 80px; left: 20px;";
      case "bottom-right":
        return "bottom: 80px; right: 20px;";
      case "top-left":
        return "top: 80px; left: 20px;";
      case "top-right":
        return "top: 80px; right: 20px;";
      default:
        return "bottom: 80px; right: 20px;";
    }
  }

  // Crear HTML del widget
  function createWidgetHTML() {
    const container = document.createElement("div");
    container.className = "chat-widget-container";
    container.id = "chat-widget-container";
    container.style.cssText = getPositionStyles();

    // Botón flotante
    const button = document.createElement("button");
    button.className = "chat-widget-button";
    button.innerHTML = "💬";
    button.setAttribute("aria-label", "Abrir chat");
    button.onclick = toggleWidget;

    // Ventana de chat
    const window = document.createElement("div");
    window.className = "chat-widget-window";
    window.id = "chat-widget-window";
    window.style.display = "none";

    // Construir header con logo si está disponible
    const headerContent = widgetState.branding?.logoUrl
      ? `<img src="${widgetState.branding.logoUrl}" alt="Logo" style="max-height: 30px; max-width: 150px; object-fit: contain;">`
      : "<h3>Chat de Soporte</h3>";

    window.innerHTML = `
      <div class="chat-widget-header">
        ${headerContent}
        <button class="chat-widget-close" onclick="window.chatWidgetToggle()" aria-label="Cerrar chat">×</button>
      </div>
      <div class="chat-widget-messages" id="chat-widget-messages">
        <div class="chat-widget-message inbound">
          ${widgetState.config.welcomeMessage}
        </div>
      </div>
      <div class="chat-widget-input-container">
        <input 
          type="text" 
          class="chat-widget-input" 
          id="chat-widget-input"
          placeholder="${widgetState.config.placeholder}"
          onkeypress="if(event.key==='Enter') window.chatWidgetSend()"
        />
        <button class="chat-widget-send" id="chat-widget-send" onclick="window.chatWidgetSend()">→</button>
      </div>
    `;

    container.appendChild(button);
    container.appendChild(window);
    document.body.appendChild(container);

    // Exponer funciones globales
    window.chatWidgetToggle = toggleWidget;
    window.chatWidgetSend = sendMessage;
  }

  // Alternar widget
  function toggleWidget() {
    widgetState.isOpen = !widgetState.isOpen;
    const window = document.getElementById("chat-widget-window");
    const button = document.querySelector(".chat-widget-button");

    if (window) {
      window.style.display = widgetState.isOpen ? "flex" : "none";
    }
    if (button) {
      button.style.display = widgetState.isOpen ? "none" : "flex";
    }

    if (widgetState.isOpen && widgetState.conversationId) {
      loadMessages();
    }
  }

  // Enviar mensaje
  async function sendMessage() {
    const input = document.getElementById("chat-widget-input");
    const sendButton = document.getElementById("chat-widget-send");

    if (!input || !sendButton) return;

    const content = input.value.trim();
    if (!content) return;

    // Deshabilitar input
    input.disabled = true;
    sendButton.disabled = true;

    // Agregar mensaje a la UI
    addMessage(content, "outbound");

    // Limpiar input
    input.value = "";

    try {
      // Generar participantId si no existe
      if (!widgetState.participantId) {
        widgetState.participantId = `webchat-${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 9)}`;
      }

      const response = await fetch(
        `${DEFAULT_CONFIG.apiUrl}/api/public/webchat/messages/${widgetState.tenantSlug}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content,
            conversationId: widgetState.conversationId,
            participantId: widgetState.participantId,
          }),
        }
      );

      const result = await response.json();

      if (result.success) {
        widgetState.conversationId = result.data.conversationId;

        // Esperar un momento y recargar mensajes para obtener respuesta
        setTimeout(() => {
          loadMessages();
        }, 1000);
      } else {
        addMessage(
          "Lo siento, hubo un error al enviar tu mensaje. Por favor, intenta de nuevo.",
          "inbound"
        );
      }
    } catch (error) {
      console.error("Chat Widget: Error al enviar mensaje", error);
      addMessage(
        "Lo siento, hubo un error al enviar tu mensaje. Por favor, intenta de nuevo.",
        "inbound"
      );
    } finally {
      input.disabled = false;
      sendButton.disabled = false;
      input.focus();
    }
  }

  // Agregar mensaje a la UI
  function addMessage(content, direction) {
    const messagesContainer = document.getElementById("chat-widget-messages");
    if (!messagesContainer) return;

    const messageDiv = document.createElement("div");
    messageDiv.className = `chat-widget-message ${direction}`;
    messageDiv.textContent = content;
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  // Cargar mensajes
  async function loadMessages() {
    if (!widgetState.conversationId || !widgetState.tenantSlug) return;

    try {
      const response = await fetch(
        `${DEFAULT_CONFIG.apiUrl}/api/public/webchat/messages/${widgetState.conversationId}/${widgetState.tenantSlug}`
      );
      const result = await response.json();

      if (result.success) {
        const messagesContainer = document.getElementById(
          "chat-widget-messages"
        );
        if (!messagesContainer) return;

        // Limpiar mensajes existentes (excepto el de bienvenida)
        const welcomeMessage = messagesContainer.querySelector(
          ".chat-widget-message.inbound"
        );
        messagesContainer.innerHTML = "";
        if (welcomeMessage) {
          messagesContainer.appendChild(welcomeMessage);
        }

        // Agregar mensajes
        result.data.messages.forEach((msg) => {
          addMessage(msg.content, msg.direction.toLowerCase());
        });
      }
    } catch (error) {
      console.error("Chat Widget: Error al cargar mensajes", error);
    }
  }

  // Inicializar cuando el DOM esté listo
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadConfig);
  } else {
    loadConfig();
  }
})();
