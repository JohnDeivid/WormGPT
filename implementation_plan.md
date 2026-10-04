# Plan de Implementación: Terminal Autónoma y Tool Calling para WormGPT

Este plan describe los cambios necesarios en el backend y frontend de WormGPT para implementar la infraestructura de **Tool Calling (Llamada a Herramientas)** de forma que el modelo de IA pueda interactuar de manera autónoma con la terminal del sistema en tiempo real.

---

## Cambio de Diseño: Terminal Compartida y Ejecución Autónoma

Para lograr que el modelo de IA pueda ejecutar comandos en la terminal del usuario, mostrar el progreso en tiempo real y sincronizar visualmente todo con el panel de terminal integrado, implementaremos la siguiente arquitectura:

1. **Backend**:
   - Registrar la herramienta `execute_command` en el modelo Gemini usando la API de Function Calling.
   - Soportar el rol de mensaje `function` y mapear los roles correspondientes de Gemini sin coercionarlos todos a `user`.
   - Modificar la API de chat (`/api/chat`) para que en el streaming de Server-Sent Events (SSE) se envíen los eventos de `functionCalls` cuando el modelo decida usarlos.

2. **Frontend (Estado Compartido y Control de Terminal)**:
   - Elevar el estado de la terminal (`terminalLines`, `isTerminalRunning`) del componente `TerminalPanel` al componente principal `App`.
   - Establecer la conexión WebSocket en el componente `App` al iniciar la aplicación para que esté disponible de manera persistente, incluso cuando el panel de terminal esté cerrado.
   - Implementar un ejecutor de comandos centralizado `executeTerminalCommand(command)` que:
     1. Agregue el comando a las líneas de la terminal.
     2. Simule la escritura del comando letra por letra en la terminal para un efecto visual premium.
     3. Envíe el comando mediante el WebSocket de terminal.
     4. Capture `stdout` y `stderr` en tiempo real, actualizando las líneas de la terminal y un buffer interno.
     5. Resuelva una promesa cuando se reciba el evento `exit`, devolviendo el resultado completo del comando.

3. **Interfaz de Chat (Visualización de Ejecución)**:
   - Crear un componente visual premium dentro del historial del chat para representar las llamadas a herramientas (`toolCall`). Mostrará un indicador de estado animado ("💻 Ejecutando...", "✅ Completado" o "❌ Error") junto con el comando y una pequeña vista previa del output.
   - Abrir opcionalmente el panel de la terminal en tiempo real para que el usuario pueda ver la ejecución "en vivo".

4. **Loop Cerrado (Retroalimentación al Modelo)**:
   - Al recibir una llamada de herramienta en la respuesta de `/api/chat`:
     1. Pausar la generación regular de la IA.
     2. Insertar un bloque visual de ejecución en el chat.
     3. Ejecutar el comando a través del puente de la terminal.
     4. Construir el historial de mensajes de la IA incluyendo el `functionCall` original y la respuesta del comando con rol `function`.
     5. Volver a disparar `handleSendMessage` automáticamente con la respuesta de la terminal para que la IA continúe razonando sobre el resultado del comando.

---

## Propuesta de Cambios

### 1. Backend: [index.js](file:///c:/Users/User%20Name/Downloads/WormGPT--main/WormGPT--main/WormgptWindows/wormgpt_enhanced/server/index.js)

#### [MODIFY] [index.js](file:///c:/Users/User%20Name/Downloads/WormGPT--main/WormGPT--main/WormgptWindows/wormgpt_enhanced/server/index.js)
- Registrar la herramienta `execute_command` en el cliente de Gemini.
- Actualizar el parseo de mensajes recibidos para mapear correctamente los roles `assistant` -> `model` y `function` -> `function`.
- Modificar el endpoint `/api/chat` para transmitir los eventos de `functionCalls` en el stream SSE y en la respuesta estática.

```javascript
// Definición de la herramienta
const executeCommandTool = {
  functionDeclarations: [
    {
      name: 'execute_command',
      description: 'Executes a command in the user\'s integrated system terminal and returns the stdout and stderr.',
      parameters: {
        type: 'OBJECT',
        properties: {
          command: {
            type: 'STRING',
            description: 'The shell command to execute in the system terminal.'
          }
        },
        required: ['command']
      }
    }
  ]
};

// ...

// Dentro de app.post('/api/chat', ...)
const geminiModel = genAI.getGenerativeModel({
  model: modelName,
  systemInstruction: systemInstruction,
  tools: [executeCommandTool] // ← Habilitar la herramienta
});

// Corrección de mapeo de roles
for (const msg of messages) {
  if (msg.role === 'system') {
    systemInstruction += '\n' + msg.content;
  } else {
    // Si msg.content ya es un array de partes (imágenes, toolCalls, functionResponses), pasarlo tal cual.
    const parts = Array.isArray(msg.content)
      ? msg.content
      : [{ text: msg.content }];
    
    let geminiRole = 'user';
    if (msg.role === 'assistant' || msg.role === 'model') {
      geminiRole = 'model';
    } else if (msg.role === 'function') {
      geminiRole = 'function';
    }

    geminiMessages.push({
      role: geminiRole,
      parts
    });
  }
}
```

### 2. Frontend: [App.tsx](file:///c:/Users/User%20Name/Downloads/WormGPT--main/WormGPT--main/WormgptWindows/wormgpt_enhanced/app/src/App.tsx)

#### [MODIFY] [App.tsx](file:///c:/Users/User%20Name/Downloads/WormGPT--main/WormGPT--main/WormgptWindows/wormgpt_enhanced/app/src/App.tsx)
- Modificar las interfaces de `Message` para admitir `toolCall` y `toolResponse`.
- Elevar el estado de la terminal y su WebSocket a nivel de `App`.
- Implementar la función `executeTerminalCommand(command)`.
- Modificar el renderizado de los mensajes de la IA para mostrar la caja de ejecución de la terminal.
- Actualizar `handleSendMessage` para capturar la respuesta del stream SSE que contiene `functionCalls` y disparar el bucle de retroalimentación cerrado.

---

## Plan de Verificación

### Pruebas Manuales
1. **Ejecución de un comando simple**: Preguntar a la IA "Mira qué archivos hay en mi carpeta" o "Muéstrame la lista de archivos".
2. **Visualización de Terminal**: Verificar que el panel de la terminal se abre de forma automática o que al abrirlo manualmente muestra el comando simulándose y ejecutándose en tiempo real.
3. **Loop Cerrado (Autocorrección)**: Intentar que la IA ejecute un comando inexistente y ver si, al recibir el error, la terminal devuelve el stderr, la IA lo procesa e intenta autocorregirse probando otro comando diferente.
4. **Verificación de UI**: Comprobar el diseño visual del bloque de ejecución en el chat para asegurar que se ve premium, moderno y encaja con la estética WormGPT.
