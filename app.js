class MariselFlix {
    constructor() {
        this.baseURL = 'https://movieapi.giftedtech.co.ke';
        this.currentMovie = null;
        this.currentHeroIndex = 0;
        this.heroMovies = [];
        this.continueWatching = JSON.parse(localStorage.getItem('continueWatching')) || [];
        this.trailerPlaying = false;
        this.deferredPrompt = null;
        this.lastHeroUpdate = localStorage.getItem('lastHeroUpdate');
        this.currentVideoTime = 0;
        
        // Custom Player State
        this.isPlaying = false;
        this.isFullscreen = false;
        this.isMiniplayer = false;
        this.isLocked = false;
        this.controlsTimeout = null;
        this.controlsVisible = true;
        this.currentPlaybackSpeed = 1;
        this.currentQuality = 'auto';
        
        this.init();
    }

    init() {
        setTimeout(() => {
            document.getElementById('loading-screen').style.display = 'none';
            this.setupEventListeners();
            this.loadHomepageContent();
            this.startHeroRotation();
            this.showInstallBanner();
            this.registerServiceWorker();
            
            if (window.location.pathname === '/player') {
                this.initCustomPlayer();
            }
        }, 3000);
    }

    setupEventListeners() {
        const searchToggle = document.getElementById('search-toggle');
        if (searchToggle) {
            searchToggle.addEventListener('click', () => {
                window.location.href = '/search';
            });
        }

        document.querySelectorAll('.category-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const category = tab.dataset.category;
                this.loadCategoryContent(category);
                document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
            });
        });

        const heroPlayBtn = document.getElementById('hero-play-btn');
        if (heroPlayBtn) {
            heroPlayBtn.addEventListener('click', () => {
                if (this.heroMovies.length > 0) {
                    const currentHeroMovie = this.heroMovies[this.currentHeroIndex];
                    window.location.href = `/details?id=${currentHeroMovie.subjectId}`;
                }
            });
        }

        const installApp = document.getElementById('install-app');
        if (installApp) {
            installApp.addEventListener('click', () => {
                this.installApp();
            });
        }

        const installLater = document.getElementById('install-later');
        if (installLater) {
            installLater.addEventListener('click', () => {
                this.hideInstallBanner();
            });
        }

        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
        });

        window.addEventListener('appinstalled', () => {
            this.hideInstallBanner();
            this.deferredPrompt = null;
        });

        const playerVideo = document.getElementById('player-video');
        if (playerVideo) {
            playerVideo.addEventListener('timeupdate', () => {
                this.currentVideoTime = playerVideo.currentTime;
                if (this.currentMovie) {
                    this.updateContinueWatchingProgress(this.currentMovie.subjectId, playerVideo.currentTime, playerVideo.duration);
                }
            });

            playerVideo.addEventListener('ended', () => {
                if (this.currentMovie) {
                    this.removeFromContinueWatching(this.currentMovie.subjectId);
                }
            });
        }
    }

    // Custom Player Functions
    initCustomPlayer() {
        this.setupCustomPlayerEvents();
        this.hideControlsAfterTimeout();
    }

    setupCustomPlayerEvents() {
        const video = document.getElementById('player-video');
        const customPlayer = document.getElementById('custom-video-player');

        video.addEventListener('click', (e) => {
            e.stopPropagation();
            this.togglePlayPause();
        });

        video.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            this.toggleFullscreen();
        });

        video.addEventListener('play', () => {
            this.isPlaying = true;
            this.updatePlayPauseButton();
            this.hideControlsAfterTimeout();
        });

        video.addEventListener('pause', () => {
            this.isPlaying = false;
            this.updatePlayPauseButton();
            this.showControls();
        });

        video.addEventListener('timeupdate', () => {
            this.updateProgressBar();
            this.updateTimeDisplays();
        });

        video.addEventListener('loadedmetadata', () => {
            this.updateTimeDisplays();
            this.updateProgressBar();
        });

        video.addEventListener('waiting', () => {
            this.showPlayerLoading();
        });

        video.addEventListener('canplay', () => {
            this.hidePlayerLoading();
        });

        customPlayer.addEventListener('mousemove', () => {
            this.showControls();
            this.hideControlsAfterTimeout();
        });

        customPlayer.addEventListener('touchstart', () => {
            this.showControls();
            this.hideControlsAfterTimeout();
        });

        customPlayer.addEventListener('click', (e) => {
            if (e.target === customPlayer && !this.isLocked) {
                this.togglePlayPause();
            }
        });

        document.getElementById('back-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            window.history.back();
        });

        document.getElementById('play-pause-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.togglePlayPause();
        });

        document.getElementById('rewind-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.rewind(10);
        });

        document.getElementById('forward-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.forward(10);
        });

        document.getElementById('fullscreen-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleFullscreen();
        });

        document.getElementById('screenshot-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.takeScreenshot();
        });

        document.getElementById('volume-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleMute();
        });

        document.getElementById('lock-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleLock();
        });

        document.getElementById('miniplayer-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleMiniplayer();
        });

        document.getElementById('settings-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleSettingsMenu();
        });

        const progressBar = document.getElementById('progress-bar');
        progressBar.addEventListener('click', (e) => {
            e.stopPropagation();
            this.seekToPosition(e);
        });

        progressBar.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            this.startSeeking(e);
        });

        progressBar.addEventListener('touchstart', (e) => {
            e.stopPropagation();
            this.startSeeking(e);
        });

        this.setupSettingsMenu();

        document.addEventListener('fullscreenchange', () => {
            this.isFullscreen = !!document.fullscreenElement;
            this.updateFullscreenButton();
        });

        document.addEventListener('keydown', (e) => {
            if (!this.isLocked) {
                this.handleKeyboardShortcuts(e);
            }
        });

        document.addEventListener('click', (e) => {
            const settingsMenu = document.getElementById('settings-menu');
            if (settingsMenu && !settingsMenu.contains(e.target) && 
                !document.getElementById('settings-btn').contains(e.target)) {
                settingsMenu.classList.remove('active');
            }
        });
    }

    setupSettingsMenu() {
        document.getElementById('quality-option').addEventListener('click', (e) => {
            e.stopPropagation();
            const submenu = document.getElementById('quality-submenu');
            submenu.classList.toggle('active');
            document.getElementById('speed-submenu').classList.remove('active');
        });

        document.getElementById('speed-option').addEventListener('click', (e) => {
            e.stopPropagation();
            const submenu = document.getElementById('speed-submenu');
            submenu.classList.toggle('active');
            document.getElementById('quality-submenu').classList.remove('active');
        });

        document.querySelectorAll('#quality-submenu .settings-suboption').forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                const quality = option.dataset.quality;
                this.changeQuality(quality);
                document.querySelectorAll('#quality-submenu .settings-suboption').forEach(opt => {
                    opt.classList.remove('active');
                });
                option.classList.add('active');
                document.getElementById('quality-submenu').classList.remove('active');
            });
        });

        document.querySelectorAll('#speed-submenu .settings-suboption').forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                const speed = parseFloat(option.dataset.speed);
                this.changePlaybackSpeed(speed);
                document.querySelectorAll('#speed-submenu .settings-suboption').forEach(opt => {
                    opt.classList.remove('active');
                });
                option.classList.add('active');
                document.getElementById('speed-submenu').classList.remove('active');
            });
        });
    }

    togglePlayPause() {
        const video = document.getElementById('player-video');
        if (this.isPlaying) {
            video.pause();
        } else {
            video.play();
        }
    }

    rewind(seconds) {
        const video = document.getElementById('player-video');
        video.currentTime = Math.max(0, video.currentTime - seconds);
        this.showControls();
    }

    forward(seconds) {
        const video = document.getElementById('player-video');
        video.currentTime = Math.min(video.duration, video.currentTime + seconds);
        this.showControls();
    }

    toggleFullscreen() {
        const customPlayer = document.getElementById('custom-video-player');
        
        if (!this.isFullscreen) {
            if (customPlayer.requestFullscreen) {
                customPlayer.requestFullscreen();
            } else if (customPlayer.webkitRequestFullscreen) {
                customPlayer.webkitRequestFullscreen();
            } else if (customPlayer.msRequestFullscreen) {
                customPlayer.msRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
        }
        
        this.showControls();
    }

    toggleMute() {
        const video = document.getElementById('player-video');
        const volumeBtn = document.getElementById('volume-btn');
        
        video.muted = !video.muted;
        
        if (video.muted) {
            volumeBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
        } else {
            if (video.volume >= 0.5) {
                volumeBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
            } else if (video.volume > 0) {
                volumeBtn.innerHTML = '<i class="fas fa-volume-down"></i>';
            } else {
                volumeBtn.innerHTML = '<i class="fas fa-volume-off"></i>';
            }
        }
        
        this.showControls();
    }

    toggleLock() {
        this.isLocked = !this.isLocked;
        const lockBtn = document.getElementById('lock-btn');
        const overlay = document.getElementById('player-overlay');
        const lockIndicator = document.getElementById('lock-indicator');
        
        if (this.isLocked) {
            lockBtn.innerHTML = '<i class="fas fa-unlock"></i>';
            overlay.classList.add('locked');
            this.hideControls();
            lockIndicator.classList.add('show');
            setTimeout(() => {
                lockIndicator.classList.remove('show');
            }, 2000);
        } else {
            lockBtn.innerHTML = '<i class="fas fa-lock"></i>';
            overlay.classList.remove('locked');
            this.showControls();
        }
    }

    toggleMiniplayer() {
        this.showToast('Miniplayer feature coming soon!');
        this.showControls();
    }

    toggleSettingsMenu() {
        const settingsMenu = document.getElementById('settings-menu');
        settingsMenu.classList.toggle('active');
        this.showControls();
    }

    takeScreenshot() {
        const video = document.getElementById('player-video');
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `screenshot-${new Date().getTime()}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
        
        this.showToast('Screenshot saved!');
        this.showControls();
    }

    changeQuality(quality) {
        this.currentQuality = quality;
        this.showToast(`Quality changed to ${quality}`);
        this.showControls();
    }

    changePlaybackSpeed(speed) {
        const video = document.getElementById('player-video');
        video.playbackRate = speed;
        this.currentPlaybackSpeed = speed;
        this.showToast(`Playback speed: ${speed}x`);
        this.showControls();
    }

    updateProgressBar() {
        const video = document.getElementById('player-video');
        const progressFilled = document.getElementById('progress-filled');
        const progressHandle = document.getElementById('progress-handle');
        
        if (video.duration) {
            const progress = (video.currentTime / video.duration) * 100;
            progressFilled.style.width = `${progress}%`;
            progressHandle.style.left = `${progress}%`;
        }
    }

    updateTimeDisplays() {
        const video = document.getElementById('player-video');
        const currentTime = document.getElementById('current-time');
        const duration = document.getElementById('duration');
        
        if (video.duration) {
            currentTime.textContent = this.formatTime(video.currentTime);
            duration.textContent = this.formatTime(video.duration);
        }
    }

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    seekToPosition(e) {
        const video = document.getElementById('player-video');
        const progressBar = document.getElementById('progress-bar');
        const rect = progressBar.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        video.currentTime = percent * video.duration;
        this.showControls();
    }

    startSeeking(e) {
        e.preventDefault();
        const video = document.getElementById('player-video');
        const progressBar = document.getElementById('progress-bar');
        
        const seek = (moveEvent) => {
            const rect = progressBar.getBoundingClientRect();
            let percent = (moveEvent.clientX - rect.left) / rect.width;
            percent = Math.max(0, Math.min(1, percent));
            video.currentTime = percent * video.duration;
        };
        
        const stopSeeking = () => {
            document.removeEventListener('mousemove', seek);
            document.removeEventListener('mouseup', stopSeeking);
            document.removeEventListener('touchmove', seek);
            document.removeEventListener('touchend', stopSeeking);
        };
        
        document.addEventListener('mousemove', seek);
        document.addEventListener('mouseup', stopSeeking);
        document.addEventListener('touchmove', seek);
        document.addEventListener('touchend', stopSeeking);
        
        seek(e);
        this.showControls();
    }

    updatePlayPauseButton() {
        const playPauseBtn = document.getElementById('play-pause-btn');
        if (this.isPlaying) {
            playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
        } else {
            playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        }
    }

    updateFullscreenButton() {
        const fullscreenBtn = document.getElementById('fullscreen-btn');
        if (this.isFullscreen) {
            fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
        } else {
            fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
        }
    }

    showControls() {
        if (this.isLocked) return;
        
        clearTimeout(this.controlsTimeout);
        const overlay = document.getElementById('player-overlay');
        overlay.classList.add('active');
        this.controlsVisible = true;
    }

    hideControls() {
        const overlay = document.getElementById('player-overlay');
        overlay.classList.remove('active');
        this.controlsVisible = false;
        const settingsMenu = document.getElementById('settings-menu');
        if (settingsMenu) {
            settingsMenu.classList.remove('active');
        }
    }

    hideControlsAfterTimeout() {
        if (this.isLocked) return;
        
        clearTimeout(this.controlsTimeout);
        this.controlsTimeout = setTimeout(() => {
            if (this.isPlaying) {
                this.hideControls();
            }
        }, 3000);
    }

    handleKeyboardShortcuts(e) {
        switch(e.key.toLowerCase()) {
            case ' ':
            case 'k':
                e.preventDefault();
                this.togglePlayPause();
                break;
            case 'f':
                e.preventDefault();
                this.toggleFullscreen();
                break;
            case 'm':
                e.preventDefault();
                this.toggleMute();
                break;
            case 'arrowleft':
                e.preventDefault();
                this.rewind(5);
                break;
            case 'arrowright':
                e.preventDefault();
                this.forward(5);
                break;
            case 'l':
                e.preventDefault();
                this.toggleLock();
                break;
            case 'c':
                e.preventDefault();
                this.takeScreenshot();
                break;
        }
    }

    showPlayerLoading() {
        const loading = document.querySelector('.player-loading');
        if (loading) {
            loading.style.display = 'block';
        }
    }

    hidePlayerLoading() {
        const loading = document.querySelector('.player-loading');
        if (loading) {
            loading.style.display = 'none';
        }
    }

    showInstallBanner() {
        if (window.matchMedia('(display-mode: standalone)').matches) {
            return;
        }

        const bannerDismissed = localStorage.getItem('installBannerDismissed');
        if (!bannerDismissed && this.deferredPrompt) {
            setTimeout(() => {
                const installBanner = document.getElementById('install-banner');
                if (installBanner) {
                    installBanner.style.display = 'block';
                }
            }, 2000);
        }
    }

    hideInstallBanner() {
        const installBanner = document.getElementById('install-banner');
        if (installBanner) {
            installBanner.style.display = 'none';
        }
        localStorage.setItem('installBannerDismissed', 'true');
    }

    async installApp() {
        if (this.deferredPrompt) {
            this.deferredPrompt.prompt();
            const { outcome } = await this.deferredPrompt.userChoice;
            
            if (outcome === 'accepted') {
                this.hideInstallBanner();
            }
            
            this.deferredPrompt = null;
        } else {
            alert('To install Marisel Flix, use the "Add to Home Screen" option in your browser menu.');
            this.hideInstallBanner();
        }
    }

    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then((registration) => {
                    console.log('Service Worker registered successfully:', registration);
                })
                .catch((error) => {
                    console.log('Service Worker registration failed:', error);
                });
        }
    }

    async loadHomepageContent() {
        try {
            await this.loadHeroMovies();
            this.updateHeroContent();

            const animeResponse = await this.searchMovies('anime 2025', 15);
            const animeContainer = document.getElementById('anime-movies');
            if (animeContainer) {
                animeContainer.innerHTML = this.createMovieCards(animeResponse.results.items);
            }

            this.loadContinueWatching();

            const trendingResponse = await this.searchMovies('2025', 15);
            const trendingContainer = document.getElementById('top-trending');
            if (trendingContainer) {
                trendingContainer.innerHTML = this.createMovieCards(trendingResponse.results.items);
            }

            const nollywoodResponse = await this.searchMovies('nollywood 2025', 15);
            const nollywoodContainer = document.getElementById('nollywood-movies');
            if (nollywoodContainer) {
                nollywoodContainer.innerHTML = this.createMovieCards(nollywoodResponse.results.items);
            }

            const chineseResponse = await this.searchMovies('chinese 2025', 15);
            const chineseContainer = document.getElementById('chinese-movies');
            if (chineseContainer) {
                chineseContainer.innerHTML = this.createMovieCards(chineseResponse.results.items);
            }

            const romanceResponse = await this.searchMovies('romance 2025', 15);
            const romanceContainer = document.getElementById('romance-movies');
            if (romanceContainer) {
                romanceContainer.innerHTML = this.createMovieCards(romanceResponse.results.items);
            }

            const teenMoviesResponse = await this.searchMovies('teen movies 2025', 15);
            const teenMoviesContainer = document.getElementById('teen-movies');
            if (teenMoviesContainer) {
                teenMoviesContainer.innerHTML = this.createMovieCards(teenMoviesResponse.results.items);
            }

            const teenSeriesResponse = await this.searchMovies('teen series 2025', 15);
            const teenSeriesContainer = document.getElementById('teen-series');
            if (teenSeriesContainer) {
                teenSeriesContainer.innerHTML = this.createMovieCards(teenSeriesResponse.results.items);
            }

            const halloweenResponse = await this.searchMovies('halloween 2025', 15);
            const halloweenContainer = document.getElementById('new-releases');
            if (halloweenContainer) {
                halloweenContainer.innerHTML = this.createMovieCards(halloweenResponse.results.items);
            }

            const popularMoviesResponse = await this.searchMovies('2025', 15);
            const popularMoviesContainer = document.getElementById('popular-movies');
            if (popularMoviesContainer) {
                popularMoviesContainer.innerHTML = this.createMovieCards(popularMoviesResponse.results.items);
            }

            const seriesResponse = await this.searchMovies('series 2025', 15);
            const popularSeriesContainer = document.getElementById('popular-series');
            if (popularSeriesContainer) {
                popularSeriesContainer.innerHTML = this.createMovieCards(seriesResponse.results.items);
            }

            const horrorResponse = await this.searchMovies('horror 2025', 15);
            const horrorContainer = document.getElementById('horror-movies');
            if (horrorContainer) {
                horrorContainer.innerHTML = this.createMovieCards(horrorResponse.results.items);
            }

            const disneyResponse = await this.searchMovies('disney 2025', 15);
            const disneyContainer = document.getElementById('disney-movies');
            if (disneyContainer) {
                disneyContainer.innerHTML = this.createMovieCards(disneyResponse.results.items);
            }

            const marvelResponse = await this.searchMovies('marvel 2025', 15);
            const marvelContainer = document.getElementById('marvel-movies');
            if (marvelContainer) {
                marvelContainer.innerHTML = this.createMovieCards(marvelResponse.results.items);
            }

            this.addMovieCardListeners();
        } catch (error) {
            console.error('Error loading homepage content:', error);
        }
    }

    async loadHeroMovies() {
        const today = new Date().toDateString();
        
        if (this.lastHeroUpdate !== today) {
            const heroResponse = await this.searchMovies('2025', 10);
            this.heroMovies = heroResponse.results.items;
            localStorage.setItem('lastHeroUpdate', today);
            localStorage.setItem('heroMovies', JSON.stringify(this.heroMovies));
        } else {
            const cachedHeroMovies = localStorage.getItem('heroMovies');
            if (cachedHeroMovies) {
                this.heroMovies = JSON.parse(cachedHeroMovies);
            } else {
                const heroResponse = await this.searchMovies('2025', 10);
                this.heroMovies = heroResponse.results.items;
                localStorage.setItem('heroMovies', JSON.stringify(this.heroMovies));
            }
        }
    }

    startHeroRotation() {
        setInterval(() => {
            this.currentHeroIndex = (this.currentHeroIndex + 1) % this.heroMovies.length;
            this.updateHeroContent();
        }, 5000);
    }

    updateHeroContent() {
        if (this.heroMovies.length === 0) return;
        
        const movie = this.heroMovies[this.currentHeroIndex];
        const heroSection = document.getElementById('hero-section');
        const heroTitle = document.getElementById('hero-title');
        
        if (heroSection && heroTitle) {
            heroSection.style.backgroundImage = `url(${movie.cover?.url || movie.thumbnail})`;
            heroTitle.textContent = movie.title;
        }
    }

    async searchMovies(query, limit = 50) {
        try {
            const response = await fetch(`${this.baseURL}/api/search/${encodeURIComponent(query)}`);
            const data = await response.json();
            
            if (data.status === 200 && data.success) {
                const filteredItems = data.results.items.filter(movie => {
                    const releaseYear = movie.releaseDate ? parseInt(movie.releaseDate.split('-')[0]) : 0;
                    return releaseYear >= 2020 && releaseYear <= 2025;
                });
                
                return {
                    ...data,
                    results: {
                        ...data.results,
                        items: filteredItems.slice(0, limit)
                    }
                };
            }
            throw new Error('Search failed');
        } catch (error) {
            console.error('Search error:', error);
            return { results: { items: [] } };
        }
    }

    async getMovieInfo(movieId) {
        try {
            const response = await fetch(`${this.baseURL}/api/info/${movieId}`);
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching movie info:', error);
            return null;
        }
    }

    async getDownloadSources(movieId, season = null, episode = null) {
        try {
            let url = `${this.baseURL}/api/sources/${movieId}`;
            if (season !== null && episode !== null) {
                url += `?season=${season}&episode=${episode}`;
            }
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.results && data.results.length > 0) {
                return data;
            } else if (data.sources && data.sources.length > 0) {
                return { results: data.sources };
            } else {
                return { results: [] };
            }
        } catch (error) {
            console.error('Error fetching download sources:', error);
            return { results: [] };
        }
    }

    createMovieCards(movies) {
        if (!movies || movies.length === 0) {
            return '<div class="loading"><div class="spinner"></div></div>';
        }

        return movies.map(movie => {
            const continueWatchingData = this.getContinueWatchingData(movie.subjectId);
            const progressBar = continueWatchingData ? `
                <div class="continue-progress">
                    <div class="continue-progress-bar" style="width: ${continueWatchingData.progress}%"></div>
                </div>
                <div class="continue-watching-indicator">Continue</div>
            ` : '';

            return `
                <div class="movie-card" data-id="${movie.subjectId}">
                    ${movie.subjectType === 2 ? '<div class="movie-type">Series</div>' : '<div class="movie-type">Movie</div>'}
                    <img src="${movie.cover?.url || movie.thumbnail || 'https://via.placeholder.com/120x160/333/666?text=No+Image'}" 
                         alt="${movie.title}" 
                         class="movie-poster"
                         onerror="this.src='https://via.placeholder.com/120x160/333/666?text=No+Image'">
                    ${progressBar}
                    <div class="movie-info">
                        <h3 class="movie-title">${movie.title}</h3>
                        <div class="movie-meta">
                            <span>${movie.releaseDate?.split('-')[0] || '2025'}</span>
                            <span>${movie.imdbRatingValue || 'N/A'}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    addMovieCardListeners() {
        document.querySelectorAll('.movie-card').forEach(card => {
            card.addEventListener('click', () => {
                const movieId = card.dataset.id;
                const continueWatchingData = this.getContinueWatchingData(movieId);
                
                if (continueWatchingData) {
                    window.location.href = `/player?id=${movieId}&time=${continueWatchingData.currentTime}`;
                } else {
                    window.location.href = `/details?id=${movieId}`;
                }
            });
        });
    }

    getContinueWatchingData(movieId) {
        const continueData = JSON.parse(localStorage.getItem('continueWatchingData') || '{}');
        return continueData[movieId];
    }

    updateContinueWatchingProgress(movieId, currentTime, duration) {
        const progress = (currentTime / duration) * 100;
        const continueData = JSON.parse(localStorage.getItem('continueWatchingData') || '{}');
        
        continueData[movieId] = {
            currentTime: currentTime,
            duration: duration,
            progress: progress,
            lastWatched: new Date().toISOString(),
            movieId: movieId
        };
        
        localStorage.setItem('continueWatchingData', JSON.stringify(continueData));
        this.loadContinueWatching();
    }

    removeFromContinueWatching(movieId) {
        const continueData = JSON.parse(localStorage.getItem('continueWatchingData') || '{}');
        delete continueData[movieId];
        localStorage.setItem('continueWatchingData', JSON.stringify(continueData));
        this.loadContinueWatching();
    }

    loadContinueWatching() {
        const container = document.getElementById('continue-watching');
        if (!container) return;
        
        const continueData = JSON.parse(localStorage.getItem('continueWatchingData') || '{}');
        const movieIds = Object.keys(continueData);
        
        if (movieIds.length > 0) {
            const sortedMovies = movieIds
                .map(movieId => continueData[movieId])
                .sort((a, b) => new Date(b.lastWatched) - new Date(a.lastWatched))
                .slice(0, 6);

            Promise.all(
                sortedMovies.map(item => this.getMovieInfo(item.movieId))
            ).then(movies => {
                const validMovies = movies
                    .filter(movie => movie && movie.success)
                    .map(movie => movie.results.subject);
                
                container.innerHTML = this.createMovieCards(validMovies);
                this.addMovieCardListeners();
            });
        } else {
            container.innerHTML = '<p class="text-center">No recent movies. Start watching to see them here!</p>';
        }
    }

    async loadCategoryContent(category) {
        let searchQuery = '';
        switch(category) {
            case 'action': searchQuery = 'action 2025'; break;
            case 'comedy': searchQuery = 'comedy 2025'; break;
            case 'drama': searchQuery = 'drama 2025'; break;
            case 'sci-fi': searchQuery = 'sci-fi 2025'; break;
            case 'horror': searchQuery = 'horror 2025'; break;
            case 'anime': searchQuery = 'anime 2025'; break;
            case 'korean': searchQuery = 'korean drama 2025'; break;
            case 'nollywood': searchQuery = 'nollywood 2025'; break;
            case 'bollywood': searchQuery = 'bollywood 2025'; break;
            case 'chinese': searchQuery = 'chinese 2025'; break;
            case 'romance': searchQuery = 'romance 2025'; break;
            case 'teen-movies': searchQuery = 'teen movies 2025'; break;
            case 'teen-series': searchQuery = 'teen series 2025'; break;
            case 'disney': searchQuery = 'disney 2025'; break;
            case 'marvel': searchQuery = 'marvel 2025'; break;
            default: searchQuery = '2025'; break;
        }

        const response = await this.searchMovies(searchQuery, 15);
        const container = document.getElementById('most-watched-movies');
        if (container) {
            container.innerHTML = this.createMovieCards(response.results.items);
            this.addMovieCardListeners();
        }
    }

    formatDuration(seconds) {
        if (!seconds) return 'N/A';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
    }

    formatFileSize(bytes) {
        if (!bytes) return 'N/A';
        const mb = Math.round(parseInt(bytes) / (1024 * 1024));
        return `${mb} MB`;
    }

    async shareMovie(movieId, movieTitle) {
        const shareUrl = `${window.location.origin}/details?id=${movieId}`;
        
        if (navigator.share) {
            try {
                await navigator.share({
                    title: movieTitle,
                    text: shareUrl,
                    url: shareUrl
                });
            } catch (error) {
                console.log('Error sharing:', error);
                this.copyToClipboard(shareUrl);
            }
        } else {
            this.copyToClipboard(shareUrl);
        }
    }

    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            this.showToast('Link copied to clipboard!');
        }).catch(() => {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showToast('Link copied to clipboard!');
        });
    }

    showToast(message) {
        let toast = document.getElementById('toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'toast';
            toast.className = 'toast';
            document.body.appendChild(toast);
        }
        
        toast.innerHTML = `
            <i class="fas fa-check-circle" style="color: var(--primary)"></i>
            <span>${message}</span>
        `;
        
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    performSearch(query, resultsContainer) {
        if (!resultsContainer) return;
        
        if (query.length < 2) {
            resultsContainer.innerHTML = '<p class="text-center mt-1">Type at least 2 characters to search</p>';
            return;
        }

        resultsContainer.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

        fetch(`${this.baseURL}/api/search/${encodeURIComponent(query)}`)
            .then(response => response.json())
            .then(data => {
                if (data.status === 200 && data.success && data.results.items.length > 0) {
                    resultsContainer.innerHTML = `
                        <div class="search-results-list">
                            ${data.results.items.map(movie => `
                                <div class="search-result-item" data-id="${movie.subjectId}">
                                    <img src="${movie.cover?.url || movie.thumbnail || 'https://via.placeholder.com/80x120/333/666?text=No+Image'}" 
                                         alt="${movie.title}" 
                                         class="search-result-poster"
                                         onerror="this.src='https://via.placeholder.com/80x120/333/666?text=No+Image'">
                                    <div class="search-result-details">
                                        <h3 class="search-result-title">${movie.title}</h3>
                                        <div class="search-result-meta">
                                            <span class="year">${movie.releaseDate?.split('-')[0] || '2025'}</span>
                                            <span class="rating">${movie.imdbRatingValue || 'N/A'}</span>
                                            <span class="type">${movie.subjectType === 2 ? 'Series' : 'Movie'}</span>
                                        </div>
                                        ${movie.genre ? `<p class="search-result-genre">${movie.genre.split(',').slice(0, 3).join(', ')}</p>` : ''}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    `;
                    
                    document.querySelectorAll('.search-result-item').forEach(item => {
                        item.addEventListener('click', () => {
                            const movieId = item.dataset.id;
                            window.location.href = `/details?id=${movieId}`;
                        });
                    });
                } else {
                    resultsContainer.innerHTML = '<p class="text-center mt-1">No results found for "' + query + '"</p>';
                }
            })
            .catch(error => {
                console.error('Search error:', error);
                resultsContainer.innerHTML = '<p class="text-center mt-1">Error performing search. Please try again.</p>';
            });
    }

    loadPlayer = async function(movieId, startTime = 0, season = null, episode = null) {
        try {
            const movieInfo = await this.getMovieInfo(movieId);
            if (!movieInfo || !movieInfo.success) {
                throw new Error('Failed to load movie info');
            }

            this.currentMovie = movieInfo.results.subject;
            
            document.getElementById('player-title').textContent = this.currentMovie.title;
            document.getElementById('overlay-title').textContent = this.currentMovie.title;
            
            const sources = await this.getDownloadSources(movieId, season, episode);
            if (!sources.results || sources.results.length === 0) {
                throw new Error('No video sources available');
            }

            const lowestQuality = sources.results.reduce((prev, current) => {
                return parseInt(prev.quality) < parseInt(current.quality) ? prev : current;
            });

            const playerVideo = document.getElementById('player-video');
            
            if (playerVideo) {
                playerVideo.src = lowestQuality.download_url;
                
                this.showPlayerLoading();
                
                playerVideo.addEventListener('loadedmetadata', () => {
                    if (startTime > 0) {
                        playerVideo.currentTime = parseFloat(startTime);
                    }
                    
                    playerVideo.addEventListener('canplay', () => {
                        this.hidePlayerLoading();
                        playerVideo.play();
                    }, { once: true });
                });

                playerVideo.addEventListener('error', () => {
                    this.hidePlayerLoading();
                    alert('Error loading video. Please try again.');
                });
                
                playerVideo.addEventListener('play', () => {
                    if (this.currentMovie) {
                        this.updateContinueWatchingProgress(
                            this.currentMovie.subjectId, 
                            playerVideo.currentTime, 
                            playerVideo.duration
                        );
                    }
                });
                
                this.setupQualityOptions(sources.results);
                await this.loadPlayerRelatedMovies();
            }
        } catch (error) {
            console.error('Error loading player:', error);
            this.hidePlayerLoading();
            alert('Error loading video. Please try again.');
        }
    }

    setupQualityOptions(sources) {
        const qualitySubmenu = document.getElementById('quality-submenu');
        qualitySubmenu.innerHTML = '';
        
        sources.forEach(source => {
            const option = document.createElement('div');
            option.className = 'settings-suboption';
            option.dataset.quality = source.quality;
            option.textContent = `${source.quality}p`;
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                this.changeVideoQuality(source.download_url, source.quality);
            });
            qualitySubmenu.appendChild(option);
        });
    }

    changeVideoQuality(url, quality) {
        const video = document.getElementById('player-video');
        const currentTime = video.currentTime;
        const wasPlaying = !video.paused;
        
        this.showPlayerLoading();
        video.src = url;
        video.currentTime = currentTime;
        
        video.addEventListener('canplay', () => {
            this.hidePlayerLoading();
            if (wasPlaying) {
                video.play();
            }
            this.showToast(`Quality changed to ${quality}p`);
        }, { once: true });
    }

    async loadPlayerRelatedMovies() {
        if (!this.currentMovie) return;
        
        const relatedResponse = await this.searchMovies(this.currentMovie.genre?.split(',')[0] || '2025', 10);
        const relatedContainer = document.getElementById('player-related-movies');
        
        if (relatedContainer) {
            relatedContainer.innerHTML = this.createMovieCards(relatedResponse.results.items);
            
            document.querySelectorAll('#player-related-movies .movie-card').forEach(card => {
                card.addEventListener('click', () => {
                    const movieId = card.dataset.id;
                    window.location.href = `/details?id=${movieId}`;
                });
            });
        }
    }
}

// Page-specific initialization
document.addEventListener('DOMContentLoaded', () => {
    const mariselFlix = new MariselFlix();
    
    if (window.location.pathname === '/search') {
        const searchInput = document.getElementById('search-input');
        const searchResults = document.getElementById('search-results');
        
        if (searchInput) {
            const urlParams = new URLSearchParams(window.location.search);
            const searchQuery = urlParams.get('q');
            if (searchQuery) {
                searchInput.value = searchQuery;
                mariselFlix.performSearch(searchQuery, searchResults);
            }
            
            searchInput.addEventListener('input', (e) => {
                const query = e.target.value;
                const newUrl = query ? `/search?q=${encodeURIComponent(query)}` : '/search';
                window.history.pushState({}, '', newUrl);
                mariselFlix.performSearch(query, searchResults);
            });
            
            searchInput.focus();
        }
        
        window.addEventListener('popstate', () => {
            const urlParams = new URLSearchParams(window.location.search);
            const searchQuery = urlParams.get('q');
            if (searchInput) {
                searchInput.value = searchQuery || '';
                mariselFlix.performSearch(searchQuery || '', searchResults);
            }
        });
    }
    
    if (window.location.pathname === '/details') {
        const urlParams = new URLSearchParams(window.location.search);
        const movieId = urlParams.get('id');
        
        if (movieId) {
            mariselFlix.loadMovieDetails(movieId);
        }
    }
    
    if (window.location.pathname === '/player') {
        const urlParams = new URLSearchParams(window.location.search);
        const movieId = urlParams.get('id');
        const startTime = urlParams.get('time');
        const season = urlParams.get('season');
        const episode = urlParams.get('episode');
        
        if (movieId) {
            mariselFlix.loadPlayer(movieId, startTime, season, episode);
        }
    }
    
    if (window.location.pathname.startsWith('/category/')) {
        const category = window.location.pathname.split('/').pop();
        mariselFlix.loadCategoryPage(category);
    }
});

MariselFlix.prototype.loadMovieDetails = async function(movieId) {
    try {
        const movieInfo = await this.getMovieInfo(movieId);
        if (!movieInfo || !movieInfo.success) {
            throw new Error('Failed to load movie details');
        }

        this.currentMovie = movieInfo.results.subject;
        await this.renderMovieDetails(movieInfo.results);
    } catch (error) {
        console.error('Error loading movie details:', error);
        alert('Error loading movie details. Please try again.');
    }
};

MariselFlix.prototype.renderMovieDetails = async function(movieData) {
    const movie = movieData.subject;
    const isSeries = movie.subjectType === 2;
    
    const relatedResponse = await this.searchMovies(movie.genre?.split(',')[0] || '2025', 14);
    const relatedMovies = relatedResponse.results.items.filter(m => m.subjectId !== movie.subjectId).slice(0, 14);
    
    let seasonsHtml = '';
    if (isSeries && movieData.resource && movieData.resource.seasons) {
        seasonsHtml = await this.renderSeasons(movieData.resource.seasons, movie.subjectId);
    }

    let castHtml = '';
    if (movieData.stars && movieData.stars.length > 0) {
        castHtml = this.renderCast(movieData.stars);
    }

    let trailerHtml = '';
    if (movie.trailer && movie.trailer.videoAddress) {
        trailerHtml = this.renderTrailer(movie.trailer);
    }

    const detailsContent = document.getElementById('movie-details-content');
    if (detailsContent) {
        detailsContent.innerHTML = `
            <img src="${movie.cover?.url || movie.thumbnail}" 
                 alt="${movie.title}" 
                 class="details-poster"
                 onerror="this.src='https://via.placeholder.com/250x375/333/666?text=No+Image'">
            <h1 class="details-title">${movie.title}</h1>
            <div class="details-meta">
                <span>${movie.releaseDate?.split('-')[0] || '2025'}</span>
                <span>${this.formatDuration(movie.duration)}</span>
                <span>Rating: ${movie.imdbRatingValue || 'N/A'}</span>
            </div>
            <div class="details-genre">
                ${movie.genre ? movie.genre.split(',').map(genre => 
                    `<span class="genre-tag">${genre.trim()}</span>`
                ).join('') : ''}
            </div>
            <p class="details-description">${movie.description || 'No description available.'}</p>
            <div class="details-actions">
                <button class="btn btn-primary" id="stream-btn">
                    <i class="fas fa-play"></i> Stream
                </button>
                <button class="btn btn-secondary" id="download-btn">
                    <i class="fas fa-download"></i> Download
                </button>
                <button class="btn btn-secondary btn-share" id="share-btn">
                    <i class="fas fa-share"></i> Share
                </button>
            </div>
            ${trailerHtml}
            ${castHtml}
            ${seasonsHtml}
            <div class="related-section">
                <h3 class="related-title">Related Movies & Series</h3>
                <div class="movies-row" id="details-related-movies">
                    ${this.createMovieCards(relatedMovies)}
                </div>
            </div>
            <div class="download-options" id="download-options">
                <div class="download-title">Download Options</div>
                <div id="download-options-list"></div>
            </div>
        `;

        document.getElementById('stream-btn').addEventListener('click', async () => {
            if (isSeries) {
                alert('Please select a season and episode to stream');
            } else {
                const sources = await this.getDownloadSources(movie.subjectId);
                if (sources.results && sources.results.length > 0) {
                    window.location.href = `/player?id=${movie.subjectId}`;
                } else {
                    alert('No streaming sources available for this movie.');
                }
            }
        });

        document.getElementById('download-btn').addEventListener('click', async () => {
            await this.showDownloadOptions(movie.subjectId);
        });

        document.getElementById('share-btn').addEventListener('click', () => {
            this.shareMovie(movie.subjectId, movie.title);
        });

        if (movie.trailer && movie.trailer.videoAddress) {
            this.setupTrailer();
        }

        setTimeout(() => {
            document.querySelectorAll('#details-related-movies .movie-card').forEach(card => {
                card.addEventListener('click', () => {
                    const movieId = card.dataset.id;
                    window.location.href = `/details?id=${movieId}`;
                });
            });
        }, 100);
    }
};

MariselFlix.prototype.setupTrailer = function() {
    const trailerBtn = document.getElementById('trailer-btn');
    const trailerVideo = document.getElementById('trailer-video');
    
    if (trailerBtn && trailerVideo) {
        trailerBtn.addEventListener('click', () => {
            if (this.trailerPlaying) {
                trailerVideo.pause();
                trailerBtn.innerHTML = '<i class="fas fa-play"></i> Play Trailer';
            } else {
                trailerVideo.play();
                trailerBtn.innerHTML = '<i class="fas fa-pause"></i> Pause';
            }
            this.trailerPlaying = !this.trailerPlaying;
        });

        trailerVideo.addEventListener('timeupdate', () => {
            const currentTime = document.getElementById('trailer-current-time');
            const duration = document.getElementById('trailer-duration');
            
            if (currentTime && duration) {
                const currentMinutes = Math.floor(trailerVideo.currentTime / 60);
                const currentSeconds = Math.floor(trailerVideo.currentTime % 60);
                const durationMinutes = Math.floor(trailerVideo.duration / 60);
                const durationSeconds = Math.floor(trailerVideo.duration % 60);
                
                currentTime.textContent = `${currentMinutes}:${currentSeconds.toString().padStart(2, '0')}`;
                duration.textContent = `${durationMinutes}:${durationSeconds.toString().padStart(2, '0')}`;
            }
        });

        trailerVideo.addEventListener('loadedmetadata', () => {
            const duration = document.getElementById('trailer-duration');
            if (duration) {
                const durationMinutes = Math.floor(trailerVideo.duration / 60);
                const durationSeconds = Math.floor(trailerVideo.duration % 60);
                duration.textContent = `${durationMinutes}:${durationSeconds.toString().padStart(2, '0')}`;
            }
        });
    }
};

MariselFlix.prototype.renderSeasons = async function(seasons, movieId) {
    const sortedSeasons = seasons.sort((a, b) => a.se - b.se);
    
    let seasonsHtml = '<div class="seasons-section"><h3 class="seasons-title">Episodes & Seasons</h3>';
    
    seasonsHtml += `
        <div class="season-selector">
            <select class="season-dropdown" id="season-dropdown">
                <option value="">Select Season</option>
                ${sortedSeasons.map((season, index) => `
                    <option value="${season.se}">Season ${index + 1}</option>
                `).join('')}
            </select>
        </div>
        <div id="episodes-container"></div>
    `;
    
    seasonsHtml += '</div>';
    
    setTimeout(() => {
        const seasonDropdown = document.getElementById('season-dropdown');
        if (seasonDropdown) {
            seasonDropdown.addEventListener('change', (e) => {
                const seasonNum = parseInt(e.target.value);
                if (!isNaN(seasonNum)) {
                    const selectedSeason = sortedSeasons.find(s => s.se === seasonNum);
                    if (selectedSeason) {
                        this.renderEpisodesForSeason(seasonNum, selectedSeason.maxEp || 10, movieId);
                    }
                }
            });
            
            if (sortedSeasons.length > 0) {
                seasonDropdown.value = sortedSeasons[0].se;
                this.renderEpisodesForSeason(sortedSeasons[0].se, sortedSeasons[0].maxEp || 10, movieId);
            }
        }
    }, 100);
    
    return seasonsHtml;
};

MariselFlix.prototype.renderEpisodesForSeason = function(season, episodeCount, movieId) {
    const episodesContainer = document.getElementById('episodes-container');
    if (!episodesContainer) return;
    
    let episodesHtml = '<div class="episodes-grid">';
    
    for (let i = 1; i <= episodeCount; i++) {
        episodesHtml += `
            <div class="episode-card" data-movie-id="${movieId}" data-season="${season}" data-episode="${i}">
                <div class="episode-number">${i}</div>
            </div>
        `;
    }
    
    episodesHtml += '</div>';
    episodesContainer.innerHTML = episodesHtml;
    
    document.querySelectorAll('.episode-card').forEach(card => {
        card.addEventListener('click', async () => {
            const movieId = card.dataset.movieId;
            const season = card.dataset.season;
            const episode = card.dataset.episode;
            
            window.location.href = `/player?id=${movieId}&season=${season}&episode=${episode}`;
        });
    });
};

MariselFlix.prototype.loadCategoryPage = async function(category) {
    const categoryTitle = document.getElementById('category-title');
    if (categoryTitle) {
        const title = category.split('-').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
        categoryTitle.textContent = title;
    }
    
    let searchQuery = '';
    switch(category) {
        case 'action': searchQuery = 'action 2025'; break;
        case 'comedy': searchQuery = 'comedy 2025'; break;
        case 'drama': searchQuery = 'drama 2025'; break;
        case 'sci-fi': searchQuery = 'sci-fi 2025'; break;
        case 'horror': searchQuery = 'horror 2025'; break;
        case 'anime': searchQuery = 'anime 2025'; break;
        case 'korean': searchQuery = 'korean drama 2025'; break;
        case 'nollywood': searchQuery = 'nollywood 2025'; break;
        case 'bollywood': searchQuery = 'bollywood 2025'; break;
        case 'chinese': searchQuery = 'chinese 2025'; break;
        case 'romance': searchQuery = 'romance 2025'; break;
        case 'teen-movies': searchQuery = 'teen movies 2025'; break;
        case 'teen-series': searchQuery = 'teen series 2025'; break;
        case 'disney': searchQuery = 'disney 2025'; break;
        case 'marvel': searchQuery = 'marvel 2025'; break;
        case 'trending': searchQuery = '2025'; break;
        case 'new-releases': searchQuery = 'halloween 2025'; break;
        case 'popular-movies': searchQuery = '2025'; break;
        case 'popular-series': searchQuery = 'series 2025'; break;
        default: searchQuery = '2025'; break;
    }

    const response = await this.searchMovies(searchQuery, 50);
    const categoryContent = document.getElementById('category-content');
    
    if (categoryContent) {
        categoryContent.innerHTML = this.createMovieCards(response.results.items);
        this.addMovieCardListeners();
    }
};

MariselFlix.prototype.showDownloadOptions = async function(movieId) {
    const sources = await this.getDownloadSources(movieId);
    const downloadOptionsList = document.getElementById('download-options-list');
    const downloadOptions = document.getElementById('download-options');
    
    if (!downloadOptionsList || !downloadOptions) return;
    
    downloadOptionsList.innerHTML = '';
    
    if (sources.results && sources.results.length > 0) {
        sources.results.forEach(source => {
            const option = document.createElement('button');
            option.className = 'download-option';
            option.innerHTML = `
                <strong>${source.quality}</strong> - ${this.formatFileSize(source.size)}
            `;
            option.addEventListener('click', () => {
                this.downloadMovie(source.download_url, `${this.currentMovie.title} - ${source.quality}.mp4`);
            });
            downloadOptionsList.appendChild(option);
        });
        
        downloadOptions.style.display = 'block';
    } else {
        alert('No download sources available for this movie.');
    }
};

MariselFlix.prototype.downloadMovie = function(url, filename) {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

MariselFlix.prototype.renderTrailer = function(trailer) {
    return `
        <div class="trailer-section">
            <h3 class="trailer-title">Trailer</h3>
            <div class="trailer-player">
                <video class="trailer-video" id="trailer-video" preload="metadata" controls>
                    <source src="${trailer.videoAddress.url}" type="video/mp4">
                    Your browser does not support the video tag.
                </video>
                <div class="trailer-controls">
                    <span class="trailer-time">
                        <span id="trailer-current-time">0:00</span> / <span id="trailer-duration">0:00</span>
                    </span>
                    <button class="trailer-action" id="trailer-btn">
                        <i class="fas fa-play"></i> Play Trailer
                    </button>
                </div>
            </div>
        </div>
    `;
};

MariselFlix.prototype.renderCast = function(stars) {
    return `
        <div class="cast-section">
            <h3 class="cast-title">Cast</h3>
            <div class="cast-grid">
                ${stars.map(star => `
                    <div class="cast-card">
                        <img src="${star.avatarUrl || 'https://via.placeholder.com/60x60/333/666?text=No+Image'}" 
                             alt="${star.name}" 
                             class="cast-avatar"
                             onerror="this.src='https://via.placeholder.com/60x60/333/666?text=No+Image'">
                        <div class="cast-name">${star.name}</div>
                        <div class="cast-character">${star.character || 'Actor'}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
};
