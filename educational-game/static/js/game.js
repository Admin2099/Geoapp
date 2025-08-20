document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element References ---
    const questionText = document.getElementById('question-text');
    const answerForm = document.getElementById('answer-form');
    const answerInput = document.getElementById('answer-input');
    const submitBtn = document.getElementById('submit-btn');
    const nextBtn = document.getElementById('next-btn');
    const feedbackText = document.getElementById('feedback-text');
    const scoreDisplay = document.getElementById('score');
    
    // --- Client-Side Game State ---
    let currentCountry = '';
    let score = 0;
    const askedCountries = new Set(); 
    let map;

    // --- Map Initialization ---
    function initMap() {
        map = L.map('map').setView([20, 0], 2);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);
    }

    // --- UI Update Functions ---
    
    function setLoadingState(isLoading) {
        submitBtn.setAttribute('aria-busy', isLoading ? 'true' : 'false');
        answerInput.disabled = isLoading;
    }

    function showResultUI(result) {
        feedbackText.textContent = result.message;
        feedbackText.className = result.correct ? 'correct' : 'incorrect';
        
        if (result.correct) {
            score++;
            scoreDisplay.textContent = score;
        }

        const { lat, lon, capital } = result.location;
        map.flyTo([lat, lon], 6);
        L.marker([lat, lon]).addTo(map)
            .bindPopup(`<b>${capital}</b>`)
            .openPopup();
        
        submitBtn.style.display = 'none';
        nextBtn.style.display = 'block';
    }

    function resetForNextQuestion() {
        setLoadingState(false);
        questionText.textContent = "Loading question...";
        feedbackText.textContent = '';
        feedbackText.className = '';
        answerInput.value = '';
        answerInput.disabled = false;
        answerInput.focus();
        submitBtn.style.display = 'block';
        nextBtn.style.display = 'none';
    }

    // --- API Call Functions (UPDATED) ---
    async function getNewQuestion() {
        resetForNextQuestion();
        try {
            
            const response = await fetch('/api/question', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                
                body: JSON.stringify({ asked: Array.from(askedCountries) })
            });

            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            const data = await response.json();

            if (data.game_over) {
                questionText.textContent = data.message;
                answerForm.style.display = 'none';
                nextBtn.style.display = 'none';
            } else {
                currentCountry = data.country;
         
                askedCountries.add(currentCountry);
                questionText.textContent = `What is the capital of ${currentCountry}?`;
            }
        } catch (error) {
            questionText.textContent = "Failed to load question. Please refresh.";
            console.error("Fetch error:", error);
        }
    }

    async function handleAnswerSubmit(event) {
        event.preventDefault();
        setLoadingState(true);
        const userAnswer = answerInput.value;

        try {
            const response = await fetch('/api/check_answer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ answer: userAnswer, country: currentCountry }),
            });
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            const result = await response.json();
            showResultUI(result);
        } catch (error) {
            feedbackText.textContent = "Could not check answer. Please try again.";
            console.error("Submit error:", error);
        } finally {
            setLoadingState(false);
        }
    }

    // --- Initial Setup ---
    function initializeGame() {
        initMap();
        answerForm.addEventListener('submit', handleAnswerSubmit);
        nextBtn.addEventListener('click', getNewQuestion);
        getNewQuestion();
    }

    initializeGame();
});