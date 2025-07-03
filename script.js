let allGames = [];
let displayedGames = [];
let gamesPerPage = 12;
let currentPage = 0;
let availableGenres = [];
let availableCompanies = [];

let FileName = "games/games_gd.json";

// Load games from JSON file
async function loadGames() {
    try {
        const response = await fetch(FileName);
        const games = await response.json();
        allGames = games;
        displayedGames = [...allGames];

        // Extract unique genres and companies for filters
        extractFilterOptions();
        setupFilters();
        displayGames();
    } catch (error) {
        console.error("Error loading games:", error);
        // Fallback to hardcoded games if JSON fails
        loadFallbackGames();
    }
}

// Extract unique filter options from games data
function extractFilterOptions() {
    const genresSet = new Set();
    const companiesSet = new Set();

    allGames.forEach((game) => {
        if (game.genres) {
            game.genres.forEach((genre) => genresSet.add(genre));
        }
        if (game.company) {
            companiesSet.add(game.company);
        }
    });

    availableGenres = Array.from(genresSet).sort();
    availableCompanies = Array.from(companiesSet).sort();
}

// Fallback games if JSON loading fails
function loadFallbackGames() {
    allGames = [
        {
            title: "2048",
            iframe_url: "https://play.famobi.com/2048",
            icon_url: "https://img.cdn.famobi.com/portal/html5games/images/tmp/2048Teaser.jpg",
        },
        {
            title: "Snake",
            iframe_url: "https://play.famobi.com/snake",
            icon_url: "https://img.cdn.famobi.com/portal/html5games/images/tmp/SnakeTeaser.jpg",
        },
        {
            title: "Tetris",
            iframe_url: "https://play.famobi.com/tetris",
            icon_url: "https://img.cdn.famobi.com/portal/html5games/images/tmp/TetrisTeaser.jpg",
        },
    ];
    displayedGames = [...allGames];
    displayGames();
}

function openGame(title, url) {
    document.getElementById("modalTitle").textContent = title;
    document.getElementById("modalIframe").src = url + "?gd_sdk_referrer_url=" + encodeURIComponent("https://spel.nl");
    document.getElementById("gameModal").style.display = "block";
    document.body.style.overflow = "hidden";
}

function closeModal() {
    document.getElementById("gameModal").style.display = "none";
    document.getElementById("modalIframe").src = "";
    document.body.style.overflow = "auto";
}

function createGameCard(game) {
    const gameCard = document.createElement("div");
    gameCard.className = "game-card";
    gameCard.onclick = () => openGame(game.game_title, game.iframe_url);

    const genres = game.genres ? game.genres.slice(0, 2).join(", ") : "";
    const company = game.company ? game.company : "";

    gameCard.innerHTML = `
        <h3 class="game-title">${game.game_title}</h3>
        <div class="game-preview">
            ${game.game_icon ? `<img src="${game.game_icon}" alt="${game.game_title}" class="game-icon">` : "🎮"}
        </div>
        <div class="game-info">
            ${company ? `<div class="game-company">${company}</div>` : ""}
            ${genres ? `<div class="game-genres">${genres}</div>` : ""}
        </div>
        <button class="play-button">Play Game</button>
    `;

    return gameCard;
}

function displayGames() {
    const gamesGrid = document.querySelector(".games-grid");
    gamesGrid.innerHTML = "";

    const startIndex = currentPage * gamesPerPage;
    const endIndex = startIndex + gamesPerPage;
    const gamesToShow = displayedGames.slice(startIndex, endIndex);

    gamesToShow.forEach((game, index) => {
        const gameCard = createGameCard(game);
        gameCard.style.opacity = "0";
        gameCard.style.transform = "translateY(30px)";
        gamesGrid.appendChild(gameCard);

        // Animate cards in
        setTimeout(() => {
            gameCard.style.transition = "all 0.6s cubic-bezier(0.4, 0, 0.2, 1)";
            gameCard.style.opacity = "1";
            gameCard.style.transform = "translateY(0)";
        }, index * 100);
    });

    // Update load more button
    const loadMoreBtn = document.querySelector(".load-more-btn");
    if (endIndex >= displayedGames.length) {
        loadMoreBtn.style.display = "none";
    } else {
        loadMoreBtn.style.display = "block";
        loadMoreBtn.textContent = `Load More Games (${displayedGames.length - endIndex} remaining)`;
    }
}

function searchGames(query) {
    applyFilters();
}

function applyFilters() {
    const searchQuery = document.getElementById("searchInput").value.toLowerCase();
    const selectedGenre = document.getElementById("genreFilter").value;
    const selectedCompany = document.getElementById("companyFilter").value;
    // const selectedType = document.getElementById("typeFilter").value;

    let filteredGames = allGames.filter((game) => {
        // Text search
        const matchesSearch = !searchQuery || game.game_title.toLowerCase().includes(searchQuery) || (game.description && game.description.toLowerCase().includes(searchQuery));

        // Genre filter
        const matchesGenre = !selectedGenre || (game.genres && game.genres.includes(selectedGenre));

        // Company filter
        const matchesCompany = !selectedCompany || game.company === selectedCompany;

        // Type filter
        // const matchesType = !selectedType || game.type === selectedType;

        return matchesSearch && matchesGenre && matchesCompany //&& matchesType;
    });

    displayedGames = filteredGames;
    currentPage = 0;
    displayGames();
}

function setupFilters() {
    // Setup genre filter
    const genreFilter = document.getElementById("genreFilter");
    availableGenres.forEach((genre) => {
        const option = document.createElement("option");
        option.value = genre;
        option.textContent = genre;
        genreFilter.appendChild(option);
    });

    // Setup company filter (limit to top 20 most common)
    const companyFilter = document.getElementById("companyFilter");
    const topCompanies = availableCompanies.slice(0, 20);
    topCompanies.forEach((company) => {
        const option = document.createElement("option");
        option.value = company;
        option.textContent = company;
        companyFilter.appendChild(option);
    });

    // Add event listeners
    genreFilter.addEventListener("change", applyFilters);
    companyFilter.addEventListener("change", applyFilters);
    // document.getElementById("typeFilter").addEventListener("change", applyFilters);
}

function clearFilters() {
    document.getElementById("searchInput").value = "";
    document.getElementById("genreFilter").value = "";
    document.getElementById("companyFilter").value = "";
    // document.getElementById("typeFilter").value = "";
    applyFilters();
}

// Scroll to top functionality
function scrollToTop() {
    document.querySelector(".main-container").scrollTo({
        top: 0,
        behavior: "smooth",
    });
}

// Handle scroll events for floating elements
function handleScroll() {
    const mainContainer = document.querySelector(".main-container");
    const scrollTop = mainContainer.scrollTop;
    const scrollToTopBtn = document.getElementById("scrollToTop");
    const floatingSearch = document.getElementById("floatingSearch");
    const header = document.querySelector(".header");
    const headerBottom = header.offsetTop + header.offsetHeight;

    // Show/hide scroll to top button
    if (scrollTop > 300) {
        scrollToTopBtn.classList.add("visible");
    } else {
        scrollToTopBtn.classList.remove("visible");
    }

    // Show/hide floating search
    if (scrollTop > headerBottom + 100) {
        floatingSearch.classList.add("visible");
    } else {
        floatingSearch.classList.remove("visible");
    }
}

// Sync floating search with main search
function syncSearch() {
    const mainSearch = document.getElementById("searchInput").value;
    const floatingSearch = document.getElementById("floatingSearchInput");
    floatingSearch.value = mainSearch;
}

function loadMoreGames() {
    currentPage++;

    const gamesGrid = document.querySelector(".games-grid");
    const startIndex = currentPage * gamesPerPage;
    const endIndex = startIndex + gamesPerPage;
    const gamesToShow = displayedGames.slice(startIndex, endIndex);

    gamesToShow.forEach((game, index) => {
        const gameCard = createGameCard(game);
        gameCard.style.opacity = "0";
        gameCard.style.transform = "translateY(20px)";
        gamesGrid.appendChild(gameCard);

        setTimeout(() => {
            gameCard.style.transition = "all 0.5s ease";
            gameCard.style.opacity = "1";
            gameCard.style.transform = "translateY(0)";
        }, index * 50);
    });

    // Update load more button
    const loadMoreBtn = document.querySelector(".load-more-btn");
    if (endIndex >= displayedGames.length) {
        loadMoreBtn.style.display = "none";
    } else {
        loadMoreBtn.textContent = `Load More Games (${displayedGames.length - endIndex} remaining)`;
    }
}

// Event listeners
window.onclick = function (event) {
    const modal = document.getElementById("gameModal");
    if (event.target === modal) {
        closeModal();
    }
};

document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
        closeModal();
    }
});

// Search functionality
document.addEventListener("DOMContentLoaded", function () {
    const searchInput = document.getElementById("searchInput");
    const mainContainer = document.querySelector(".main-container");
    let searchTimeout;

    // Main search input
    searchInput.addEventListener("input", function (e) {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            applyFilters();
        }, 300);
    });

    // Scroll event listener
    mainContainer.addEventListener("scroll", handleScroll);

    // Load games on page load
    loadGames();
});

// Handle scroll events for floating elements
function handleScroll() {
    const mainContainer = document.querySelector(".main-container");
    const scrollToTop = document.querySelector(".scroll-to-top-btn");
    const searchFilters = document.querySelector(".filters-sidebar");
    const scrollTop = mainContainer.scrollTop;

    if (scrollTop > 200) {
        scrollToTop.classList.add("visible");
        searchFilters.classList.add("visible");
    } else {
        scrollToTop.classList.remove("visible");
        searchFilters.classList.remove("visible");
    }
}

// Scroll to top functionality
function scrollToTop() {
    const mainContainer = document.querySelector(".main-container");
    mainContainer.scrollTo({
        top: 0,
        behavior: "smooth",
    });
}
