const mainText = document.getElementById("mainText");
const changeTextBtn = document.getElementById("changeTextBtn");
const timerBtn = document.getElementById("timerBtn");

let phrases = [];
let timerInterval;
const sounds = [
  { src: "sounds/ding.mp3", weight: 0.8 },
  { src: "sounds/cat.mp3", weight: 0.05 },
  { src: "sounds/dog.mp3", weight: 0.05 },
  { src: "sounds/chicken.mp3", weight: 0.04 },
  { src: "sounds/chewbacca.mp3", weight: 0.04 },
  { src: "sounds/fart.mp3", weight: 0.02 },
];

// Función para obtener una frase aleatoria del array
function getRandomPhrase() {
  const randomIndex = Math.floor(Math.random() * phrases.length);
  return phrases[randomIndex];
}

// Función para obtener un sonido aleatorio basado en pesos
function getRandomSound() {
  const randomNumber = Math.random();
  let cumulativeWeight = 0;

  for (const sound of sounds) {
    cumulativeWeight += sound.weight;
    if (randomNumber < cumulativeWeight) {
      return sound.src;
    }
  }
  return sounds[sounds.length - 1].src;
}

// Cargar las frases desde el archivo JSON
fetch("phrases.json")
  .then((response) => response.json())
  .then((data) => {
    phrases = data.phrases;
    mainText.textContent = getRandomPhrase();
  })
  .catch((error) => {
    console.error("Error al cargar el archivo JSON:", error);
    mainText.textContent = "Error al cargar las frases.";
  });

changeTextBtn.addEventListener("click", () => {
  if (phrases.length > 0) {
    mainText.textContent = getRandomPhrase();
  } else {
    mainText.textContent = "No hay frases disponibles.";
  }
});

timerBtn.addEventListener("click", () => {
  clearInterval(timerInterval);
  let timeLeft = 8;
  mainText.classList.add("counting");
  mainText.textContent = timeLeft;

  timerInterval = setInterval(() => {
    timeLeft--;
    mainText.textContent = timeLeft;

    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      mainText.classList.remove("counting");
      if (phrases.length > 0) {
        mainText.textContent = getRandomPhrase();
      } else {
        mainText.textContent = "No hay frases disponibles.";
      }

      const randomSoundSrc = getRandomSound();
      const audio = new Audio(randomSoundSrc);
      audio.play();
    }
  }, 1000);
});
