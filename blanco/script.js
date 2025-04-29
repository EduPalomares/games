document.addEventListener("DOMContentLoaded", () => {
  // --- Elementos del DOM ---
  const startScreen = document.getElementById("startScreen");
  const hiddenWordScreen = document.getElementById("hiddenWordScreen");
  const setupScreen = document.getElementById("setupScreen");
  const gameScreen = document.getElementById("gameScreen");
  const startButton = document.getElementById("startButton");
  const hiddenWordDisplay = document.getElementById("hiddenWordDisplay");
  const showHiddenWordButton = document.getElementById("showHiddenWordBtn");
  const goToSetupButton = document.getElementById("goToSetupBtn");
  const numPlayersInput = document.getElementById("numPlayersInput");
  const submitButton = document.getElementById("submitPlayersBtn");
  const messageArea = document.getElementById("messageArea");
  const playerIndicatorsContainer = document.getElementById("playerIndicators");
  const activePlayerDisplay = document.getElementById("activePlayerDisplay");
  const showWordButton = document.getElementById("showWordBtn"); // Botón "Mostrar" del juego
  const prevPlayerButton = document.getElementById("prevPlayerBtn"); // Se convierte en Salir
  const nextPlayerButton = document.getElementById("nextPlayerBtn");
  const exitButton = document.getElementById("exitBtn");

  let secretWord = ""; // Palabra oculta seleccionada

  // --- Configuración ---
  const CATEGORY_WEIGHTS = {
    // ¡Configura los pesos aquí!
    sustantivos: 1,
    personajes: 1,
    verbos: 1,
    lugares: 1,
    adjetivos: 1,
    // Añade más categorías y sus pesos si las creas en words.json
  };
  const DEFAULT_HIDDEN_WORD = "Error"; // Palabra a usar si falla la carga/selección

  // --- Variables de Estado ---
  // Juego
  let totalPlayers = 0;
  let currentPlayer = 1;
  let playersData = []; // Ahora será { id: 1, seen: false, word: 'Perro' | 'Blanco' }

  // Palabra Oculta (de words.json)
  let wordData = null; // Almacenará el contenido de words.json
  let currentHiddenWord = "Palabra Oculta"; // Palabra seleccionada para la ronda actual
  let hiddenWordTimer = null;
  let isShowingHiddenWord = false;
  const HIDDEN_WORD_DURATION = 1000; // 1 segundos

  // Long Press (Pantalla Juego - Mostrar Palabra Asignada Perro/Blanco)
  let gameWordTimer = null;
  let isShowingGameWord = false;
  const GAME_WORD_DURATION = 2000; // 2 segundos

  // Long Press (Pantalla Juego - Salir)
  let exitTimer = null;
  const EXIT_DURATION = 4000; // 4 segundos

  // --- Funciones Auxiliares ---

  // Fisher-Yates (Knuth) Shuffle para aleatorizar array
  function shuffleArray(array) {
    let currentIndex = array.length,
      randomIndex;
    while (currentIndex !== 0) {
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
      [array[currentIndex], array[randomIndex]] = [
        array[randomIndex],
        array[currentIndex],
      ];
    }
    return array;
  }

  // Función para mostrar pantalla
  function showScreen(screenToShow) {
    // Oculta todas las pantallas principales
    startScreen.style.display = "none";
    hiddenWordScreen.style.display = "none";
    setupScreen.style.display = "none";
    gameScreen.style.display = "none";

    // Muestra la pantalla deseada
    // Usamos 'flex' para los contenedores que usan flexbox para centrar
    if (
      screenToShow.classList.contains("screen-container") ||
      screenToShow.classList.contains("setup-container") ||
      screenToShow.classList.contains("game-container")
    ) {
      screenToShow.style.display = "flex";
    } else {
      screenToShow.style.display = "block"; // Fallback (no debería aplicar aquí)
    }
    console.log("Mostrando pantalla:", screenToShow.id);
  }

  // Función para reiniciar el estado completo del juego
  function resetGame() {
    console.log("Reseteando juego...");
    totalPlayers = 0; // Borra número total
    currentPlayer = 1;
    playersData = []; // Borra datos de jugadores
    isShowingGameWord = false;
    isShowingHiddenWord = false; // También resetear estado de palabra oculta
    secretWord = "";

    // Limpiar timers por si acaso
    if (hiddenWordTimer) clearTimeout(hiddenWordTimer);
    if (gameWordTimer) clearTimeout(gameWordTimer);
    if (exitTimer) clearTimeout(exitTimer);
    hiddenWordTimer = null;
    gameWordTimer = null;
    exitTimer = null;

    // Limpiar displays y mensajes
    playerIndicatorsContainer.innerHTML = "";
    activePlayerDisplay.textContent = "";
    hiddenWordDisplay.textContent = "Palabra Oculta"; // Reset display palabra oculta
    messageArea.textContent = "";
    numPlayersInput.value = ""; // Borra valor del input
    numPlayersInput.style.borderColor = "#ccc";

    // Asegurar que el botón prev vuelva a '<' y esté en estado inicial
    prevPlayerButton.textContent = "<";
    prevPlayerButton.classList.remove("exit-button");
    prevPlayerButton.disabled = true; // Estado inicial por defecto
    removeExitListeners(); // Asegurar que no queden listeners de Salir
    removePrevPlayerClickListener(); // Asegurar que no queden listeners de <
  }

  // Función para seleccionar palabra aleatoria con pesos
  function selectRandomWord(data, weights) {
    if (!data) return DEFAULT_HIDDEN_WORD; // Fallback si no se cargó el JSON

    // Probabilidad de 1 en 100 para seleccionar "Blanco"
    if (Math.random() < 0.01) {
      return "Blanco";
    }

    const validCategories = Object.keys(weights).filter(
      (cat) => data[cat] && data[cat].length > 0 && weights[cat] > 0
    );

    if (validCategories.length === 0) {
      console.warn("No hay categorías válidas con palabras y peso > 0.");
      return DEFAULT_HIDDEN_WORD; // No hay categorías válidas
    }

    let totalWeight = validCategories.reduce(
      (sum, cat) => sum + (weights[cat] || 0),
      0
    );

    if (totalWeight <= 0) {
      console.warn("El peso total de las categorías válidas es 0.");
      // Si el peso es 0, elegimos una categoría válida al azar con igual probabilidad
      const randomCatIndex = Math.floor(Math.random() * validCategories.length);
      const chosenCategory = validCategories[randomCatIndex];
      const wordsInCategory = data[chosenCategory];
      const randomIndex = Math.floor(Math.random() * wordsInCategory.length);
      return wordsInCategory[randomIndex];
    }

    let randomWeight = Math.random() * totalWeight;
    let chosenCategory = null;

    for (const category of validCategories) {
      // Iterar solo sobre categorías válidas
      randomWeight -= weights[category] || 0;
      if (randomWeight <= 0) {
        chosenCategory = category;
        break;
      }
    }

    // Si por alguna razón numérica no se eligió, asegura elegir la última válida procesada
    if (!chosenCategory) {
      chosenCategory = validCategories[validCategories.length - 1];
    }

    // Ya hemos filtrado, así que la categoría debería existir y tener palabras
    const wordsInCategory = data[chosenCategory];
    const randomIndex = Math.floor(Math.random() * wordsInCategory.length);
    return wordsInCategory[randomIndex];
  }

  // Cargar el archivo JSON al inicio
  function loadWordData() {
    // Deshabilitar botón "Comenzar" mientras carga
    startButton.disabled = true;
    startButton.textContent = "Cargando..."; // Feedback visual

    fetch("words.json")
      .then((response) => {
        if (!response.ok) {
          // Lanza un error si la respuesta no es OK (ej. 404 Not Found)
          throw new Error(`Error HTTP! estado: ${response.status}`);
        }
        return response.json(); // Parsea la respuesta como JSON
      })
      .then((data) => {
        console.log("words.json cargado:", data);
        wordData = data; // Guarda los datos cargados globalmente
        startButton.disabled = false; // Habilita el botón de nuevo
        startButton.textContent = "Comenzar"; // Restaura texto del botón
      })
      .catch((error) => {
        console.error("Error al cargar o parsear words.json:", error);
        wordData = null; // Asegura que wordData esté nulo si falla la carga
        // Mantiene botón deshabilitado y muestra mensaje de error
        startButton.textContent = "Error al cargar";
        // Opcional: Mostrar un mensaje más visible al usuario
        alert(
          "No se pudieron cargar las palabras necesarias para el juego. Por favor, asegúrate de que el archivo 'words.json' existe en la misma carpeta y recarga la página."
        );
      });
  }

  // --- Lógica de Navegación y Setup ---

  // 1. Inicio -> Palabra Oculta
  startButton.addEventListener("click", () => {
    if (startButton.disabled) return; // No hacer nada si está deshabilitado (cargando/error)

    // Seleccionar la palabra ANTES de mostrar la pantalla
    currentHiddenWord = selectRandomWord(wordData, CATEGORY_WEIGHTS);
    console.log("Palabra oculta seleccionada:", currentHiddenWord);
    secretWord = currentHiddenWord; // Guarda la palabra seleccionada para uso en el juego

    // Resetear el display de la palabra oculta a su estado inicial "Palabra Oculta"
    hiddenWordDisplay.textContent = "Palabra Oculta";
    isShowingHiddenWord = false; // Asegurar estado limpio del flag

    showScreen(hiddenWordScreen); // Muestra la segunda pantalla
  });

  // 2. Palabra Oculta -> Setup Jugadores
  goToSetupButton.addEventListener("click", () => {
    // Resetear estado visual de la palabra oculta si se estaba mostrando
    if (isShowingHiddenWord) {
      hiddenWordDisplay.textContent = "Palabra Oculta";
      isShowingHiddenWord = false;
    }
    // Limpiar el timer si estaba activo
    if (hiddenWordTimer) {
      clearTimeout(hiddenWordTimer);
      hiddenWordTimer = null;
    }
    // No reseteamos currentHiddenWord aquí, se generará una nueva la próxima vez que se pulse "Comenzar"
    showScreen(setupScreen); // Muestra la pantalla de configuración de jugadores
  });

  // 3. Setup Jugadores -> Pantalla Juego
  submitButton.addEventListener("click", () => {
    messageArea.textContent = ""; // Limpia mensajes de error previos
    numPlayersInput.style.borderColor = "#ccc"; // Resetea borde del input

    const numPlayersValue = numPlayersInput.value.trim();
    const numberOfPlayers = parseInt(numPlayersValue, 10);

    // Validación del número de jugadores
    if (
      numPlayersValue === "" ||
      isNaN(numberOfPlayers) ||
      numberOfPlayers < 4
    ) {
      messageArea.textContent =
        "Introduce un número válido de jugadores (mínimo 4).";
      numPlayersInput.style.borderColor = "red";
      numPlayersInput.focus();
    } else {
      // --- Inicialización del Juego y Asignación de Palabras (Perro/Blanco) ---
      totalPlayers = numberOfPlayers;
      currentPlayer = 1; // Empieza el jugador 1
      playersData = []; // Reinicia el array de datos de jugadores

      // Calcula cuántos tendrán la palabra "Perro" (75% redondeado hacia arriba)
      const numPerro = Math.ceil(totalPlayers * 0.75);

      // Crea un array con los IDs de jugador [1, 2, ..., N]
      let playerIds = Array.from({ length: totalPlayers }, (_, i) => i + 1);
      playerIds = shuffleArray(playerIds); // Mezcla los IDs aleatoriamente

      // Asigna "Perro" o "Blanco" basado en el array mezclado
      for (let i = 0; i < totalPlayers; i++) {
        const playerId = playerIds[i];
        // Los primeros 'numPerro' en el array mezclado obtienen "Perro"
        const word = i < numPerro ? secretWord : "Blanco";
        playersData.push({ id: playerId, seen: false, word: word });
      }

      // Importante: Ordena playersData por ID para que los indicadores aparezcan en orden (1, 2, 3...)
      playersData.sort((a, b) => a.id - b.id);

      console.log("Asignación Perro/Blanco:", playersData); // Para depuración

      numPlayersInput.value = ""; // Limpiar input para la próxima vez

      generatePlayerIndicators(); // Crea los indicadores visuales de jugador
      updateGameDisplay(); // Actualiza la pantalla de juego (número, botones, etc.)
      showScreen(gameScreen); // Muestra la pantalla principal del juego
    }
  });

  // Limpia el mensaje de error del input de jugadores cuando el usuario empieza a escribir
  numPlayersInput.addEventListener("input", () => {
    if (numPlayersInput.style.borderColor === "red") {
      numPlayersInput.style.borderColor = "#ccc";
      messageArea.textContent = "";
    }
  });

  // --- Lógica Específica de Pantallas ---

  // == Pantalla Palabra Oculta: Botón "Mostrar" ==
  //    (Muestra la palabra seleccionada de words.json tras 2s)
  const startHiddenWordPress = (event) => {
    event.preventDefault();
    if (isShowingHiddenWord) return; // Si ya se muestra, no hacer nada
    // Inicia el timer
    hiddenWordTimer = setTimeout(() => {
      // Al completarse, muestra la palabra seleccionada guardada en currentHiddenWord
      hiddenWordDisplay.textContent = currentHiddenWord;
      isShowingHiddenWord = true; // Marca que se está mostrando
      hiddenWordTimer = null;
    }, HIDDEN_WORD_DURATION); // Espera 2 segundos
  };

  const endHiddenWordPress = (event) => {
    event.preventDefault();
    // Cancela el timer si se suelta antes de los 2 segundos
    if (hiddenWordTimer) {
      clearTimeout(hiddenWordTimer);
      hiddenWordTimer = null;
    }
    // Si se estaba mostrando la palabra, revierte a "Palabra Oculta"
    if (isShowingHiddenWord) {
      hiddenWordDisplay.textContent = "Palabra Oculta";
      isShowingHiddenWord = false; // Resetea el flag
    }
  };
  // Asignación de listeners al botón "Mostrar" de la pantalla Palabra Oculta
  showHiddenWordButton.addEventListener("mousedown", startHiddenWordPress);
  showHiddenWordButton.addEventListener("touchstart", startHiddenWordPress, {
    passive: false,
  });
  showHiddenWordButton.addEventListener("mouseup", endHiddenWordPress);
  showHiddenWordButton.addEventListener("mouseleave", endHiddenWordPress);
  showHiddenWordButton.addEventListener("touchend", endHiddenWordPress);
  showHiddenWordButton.addEventListener("touchcancel", endHiddenWordPress);

  // == Pantalla Juego: Lógica Principal ==

  // Genera los indicadores de jugador en la parte superior
  function generatePlayerIndicators() {
    playerIndicatorsContainer.innerHTML = ""; // Limpia indicadores anteriores
    playersData.forEach((player) => {
      const indicator = document.createElement("div");
      indicator.classList.add("player-indicator");
      indicator.textContent = player.id;
      indicator.dataset.playerId = player.id; // Guarda el ID para identificarlo al clickear
      // El listener se añade mediante delegación al contenedor
      playerIndicatorsContainer.appendChild(indicator);
    });
  }

  // Listener para clicks en los indicadores (usando delegación de eventos)
  playerIndicatorsContainer.addEventListener("click", (event) => {
    // Encuentra el elemento .player-indicator más cercano al que se hizo click
    const clickedIndicator = event.target.closest(".player-indicator");
    if (clickedIndicator) {
      // Si se hizo click en un indicador válido
      const targetPlayerId = parseInt(clickedIndicator.dataset.playerId, 10);
      // Si el jugador clickeado no es el actual
      if (targetPlayerId !== currentPlayer) {
        currentPlayer = targetPlayerId; // Cambia al jugador seleccionado
        isShowingGameWord = false; // Asegura que no se muestre la palabra al cambiar
        updateGameDisplay(); // Actualiza toda la pantalla de juego
      }
    }
  });

  // Actualiza toda la pantalla principal del juego
  function updateGameDisplay() {
    // Actualizar display central (Número o palabra asignada si se está mostrando)
    if (!isShowingGameWord) {
      activePlayerDisplay.textContent = currentPlayer; // Muestra el número del jugador
    } else {
      // Si se está mostrando la palabra (tras long press en Mostrar), busca la palabra asignada
      const playerData = playersData.find((p) => p.id === currentPlayer);
      activePlayerDisplay.textContent = playerData
        ? playerData.word
        : currentPlayer; // Muestra Perro/Blanco
    }

    // Actualizar indicadores (activo/inactivo, visto/no visto)
    const indicators =
      playerIndicatorsContainer.querySelectorAll(".player-indicator");
    indicators.forEach((indicator) => {
      const id = parseInt(indicator.dataset.playerId, 10);
      const playerData = playersData.find((p) => p.id === id);
      if (!playerData) return; // Seguridad

      // Añade/quita clase 'inactive' (opacidad reducida)
      indicator.classList.toggle("inactive", id !== currentPlayer);
      // Añade/quita clase 'seen' (fondo rojo)
      indicator.classList.toggle("seen", playerData.seen);
    });

    // Actualizar estado botones de navegación (Siguiente y gestiona Anterior/Salir)
    nextPlayerButton.disabled = currentPlayer === totalPlayers;
    updatePrevButtonState(); // Llama a la función que maneja el botón izquierdo
  }

  // Función para gestionar el estado del botón izquierdo (< / Salir)
  function updatePrevButtonState() {
    // Quita listeners anteriores para evitar duplicados
    removePrevPlayerClickListener();
    removeExitListeners();
    prevPlayerButton.classList.remove("exit-button"); // Quita estilo Salir por defecto

    if (currentPlayer === 1) {
      // Si es el primer jugador
      prevPlayerButton.textContent = "Salir"; // Cambia texto
      prevPlayerButton.disabled = false; // Habilitar siempre para poder Salir
      prevPlayerButton.classList.add("exit-button"); // Añadir estilo rojo (opcional)
      addExitListeners(); // Añadir listeners de long press (4s) para Salir
    } else {
      // Si NO es el primer jugador
      prevPlayerButton.textContent = "<"; // Texto normal
      prevPlayerButton.disabled = false; // Habilitado para ir atrás
      addPrevPlayerClickListener(); // Añadir listener de click normal para ir atrás
    }
  }

  // --- Listeners y Lógica de Botones de Juego ---

  // Botón Siguiente (>)
  nextPlayerButton.addEventListener("click", () => {
    if (currentPlayer < totalPlayers) {
      // Si no es el último jugador
      currentPlayer++; // Avanza al siguiente
      isShowingGameWord = false; // Resetea si se estaba mostrando la palabra
      updateGameDisplay(); // Actualiza la pantalla
    }
  });

  // --- Funciones para añadir/quitar listeners específicos del botón izquierdo ---

  // Listener para el botón '<' normal (click simple)
  const handlePrevPlayerClick = () => {
    if (currentPlayer > 1) {
      // Si no es el primer jugador
      currentPlayer--; // Retrocede al anterior
      isShowingGameWord = false; // Resetea si se estaba mostrando la palabra
      updateGameDisplay(); // Actualiza la pantalla
    }
  };
  function addPrevPlayerClickListener() {
    prevPlayerButton.addEventListener("click", handlePrevPlayerClick);
  }
  function removePrevPlayerClickListener() {
    prevPlayerButton.removeEventListener("click", handlePrevPlayerClick);
  }

  // Listeners para el botón 'Salir' (long press de 4 segundos)
  const startExitPress = (event) => {
    event.preventDefault();
    prevPlayerButton.style.backgroundColor = "#c82333"; // Feedback visual inmediato (rojo oscuro)
    console.log("Iniciando pulsación Salir...");
    // Inicia el timer para salir
    exitTimer = setTimeout(() => {
      // ¡ÉXITO! Se mantuvo pulsado 4 segundos
      console.log("¡Saliendo!");
      resetGame(); // Llama a la función de reseteo completo
      showScreen(startScreen); // Vuelve a la pantalla inicial
      // El timer se limpia solo, pero lo ponemos null por claridad
      exitTimer = null;
    }, EXIT_DURATION); // Espera 4 segundos
  };
  const endExitPress = (event) => {
    event.preventDefault();
    prevPlayerButton.style.backgroundColor = ""; // Resetea feedback visual
    // Si el timer estaba activo (se soltó antes de 4s), lo cancela
    if (exitTimer) {
      console.log("Pulsación Salir cancelada.");
      clearTimeout(exitTimer);
      exitTimer = null;
    }
  };
  function addExitListeners() {
    prevPlayerButton.addEventListener("mousedown", startExitPress);
    prevPlayerButton.addEventListener("touchstart", startExitPress, {
      passive: false,
    });
    prevPlayerButton.addEventListener("mouseup", endExitPress);
    prevPlayerButton.addEventListener("mouseleave", endExitPress);
    prevPlayerButton.addEventListener("touchend", endExitPress);
    prevPlayerButton.addEventListener("touchcancel", endExitPress);
  }
  function removeExitListeners() {
    prevPlayerButton.removeEventListener("mousedown", startExitPress);
    prevPlayerButton.removeEventListener("touchstart", startExitPress);
    prevPlayerButton.removeEventListener("mouseup", endExitPress);
    prevPlayerButton.removeEventListener("mouseleave", endExitPress);
    prevPlayerButton.removeEventListener("touchend", endExitPress);
    prevPlayerButton.removeEventListener("touchcancel", endExitPress);
    prevPlayerButton.style.backgroundColor = ""; // Asegurar reset visual
  }

  // Botón "Mostrar" en Pantalla Juego (muestra palabra Perro/Blanco asignada)
  const startGameWordPress = (event) => {
    event.preventDefault();
    if (isShowingGameWord) return; // Si ya se muestra, no hacer nada

    // Encuentra los datos del jugador actual
    const currentPlayerIndex = playersData.findIndex(
      (p) => p.id === currentPlayer
    );
    if (currentPlayerIndex === -1) return; // Seguridad

    // Marcar como visto al *intentar* mostrar (si no lo estaba ya)
    if (!playersData[currentPlayerIndex].seen) {
      playersData[currentPlayerIndex].seen = true;
      // Actualiza el indicador visualmente al instante
      const currentIndicator = playerIndicatorsContainer.querySelector(
        `.player-indicator[data-player-id="${currentPlayer}"]`
      );
      if (currentIndicator) {
        currentIndicator.classList.add("seen");
      }
      // No es necesario llamar a updateGameDisplay() completo solo para esto
    }

    // Obtener la palabra asignada (Perro o Blanco)
    const assignedWord = playersData[currentPlayerIndex].word;

    // Inicia el timer para mostrar la palabra asignada
    gameWordTimer = setTimeout(() => {
      activePlayerDisplay.textContent = assignedWord; // Muestra Perro o Blanco
      isShowingGameWord = true; // Marca que se está mostrando
      gameWordTimer = null;
    }, GAME_WORD_DURATION); // Espera 2 segundos
  };

  const endGameWordPress = (event) => {
    event.preventDefault();
    // Cancela el timer si se suelta antes
    if (gameWordTimer) {
      clearTimeout(gameWordTimer);
      gameWordTimer = null;
    }
    // Si se estaba mostrando Perro/Blanco, revierte al número del jugador
    if (isShowingGameWord) {
      activePlayerDisplay.textContent = currentPlayer; // Vuelve al número
      isShowingGameWord = false; // Resetea el flag
    }
  };

  const exitGameScreen = () => {
    console.log("Saliendo del juego...");
    resetGame(); // Llama a la función de reseteo completo
    showScreen(startScreen); // Vuelve a la pantalla inicial
  };

  exitButton.addEventListener("click", exitGameScreen);

  // Asignación de listeners al botón "Mostrar" de la pantalla de Juego
  showWordButton.addEventListener("mousedown", startGameWordPress);
  showWordButton.addEventListener("touchstart", startGameWordPress, {
    passive: false,
  });
  showWordButton.addEventListener("mouseup", endGameWordPress);
  showWordButton.addEventListener("mouseleave", endGameWordPress);
  showWordButton.addEventListener("touchend", endGameWordPress);
  showWordButton.addEventListener("touchcancel", endGameWordPress);

  // --- Inicialización ---
  resetGame(); // Asegura estado limpio al inicio
  loadWordData(); // Llama a la función para cargar el JSON de palabras
  showScreen(startScreen); // Muestra la pantalla de inicio al cargar la página
}); // Fin del DOMContentLoaded
