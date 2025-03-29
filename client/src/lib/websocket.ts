// WebSocket client setup for real-time game updates
let socket: WebSocket | null = null;
let reconnectTimer: number | null = null;
const listeners: Map<string, Function[]> = new Map();

/**
 * Connect to the WebSocket server
 * @returns {WebSocket} The WebSocket connection
 */
export function connectWebSocket(): WebSocket {
  if (socket && socket.readyState === WebSocket.OPEN) {
    return socket;
  }
  
  // Clean up any existing socket
  if (socket) {
    socket.close();
  }
  
  // Create new connection with correct path
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}/ws`;
  
  socket = new WebSocket(wsUrl);
  
  socket.onopen = () => {
    console.log("WebSocket connection established");
    if (reconnectTimer) {
      window.clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  };
  
  socket.onclose = () => {
    console.log("WebSocket connection closed");
    // Attempt to reconnect after 3 seconds
    if (!reconnectTimer) {
      reconnectTimer = window.setTimeout(() => {
        console.log("Attempting to reconnect WebSocket...");
        connectWebSocket();
      }, 3000);
    }
  };
  
  socket.onerror = (error) => {
    console.error("WebSocket error:", error);
  };
  
  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      
      if (data && data.type) {
        // Notify all listeners for this event type
        const eventListeners = listeners.get(data.type) || [];
        eventListeners.forEach((listener) => listener(data.data));
      }
    } catch (error) {
      console.error("Error parsing WebSocket message:", error);
    }
  };
  
  return socket;
}

/**
 * Send a message through the WebSocket
 * @param {string} type The event type
 * @param {any} data The data to send
 */
export function sendMessage(type: string, data: any): void {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    socket = connectWebSocket();
    // Wait for connection to open before sending
    socket.addEventListener('open', () => {
      socket?.send(JSON.stringify({ type, data }));
    });
    return;
  }
  
  socket.send(JSON.stringify({ type, data }));
}

/**
 * Add an event listener for WebSocket messages
 * @param {string} eventType The event type to listen for
 * @param {Function} callback The callback function
 */
export function addEventListener(eventType: string, callback: Function): void {
  const eventListeners = listeners.get(eventType) || [];
  eventListeners.push(callback);
  listeners.set(eventType, eventListeners);
}

/**
 * Remove an event listener
 * @param {string} eventType The event type
 * @param {Function} callback The callback function to remove
 */
export function removeEventListener(eventType: string, callback: Function): void {
  const eventListeners = listeners.get(eventType) || [];
  const updatedListeners = eventListeners.filter((listener) => listener !== callback);
  listeners.set(eventType, updatedListeners);
}

/**
 * Initialize WebSocket connection and setup auto-reconnect
 */
export function initWebSocket(): void {
  connectWebSocket();
  
  // Setup auto-reconnect if page visibility changes
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && (!socket || socket.readyState !== WebSocket.OPEN)) {
      connectWebSocket();
    }
  });
}