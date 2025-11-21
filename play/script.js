document.addEventListener('DOMContentLoaded', () => {
    const suits = ['s', 'h', 'd', 'c'];
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
    const suitSymbols = { 's': '♠', 'h': '♥', 'd': '♦', 'c': '♣' };

    let deck = [];
    let playerHand = [];
    let dealerHand = [];
    let selectionsHistory = "";
    let gameOver = false;

    // Selection State: Set of card codes '2s', 'Ah', etc.
    let currentSelection = new Set();

    const dealerHandEl = document.getElementById('dealer-hand');
    const playerHandEl = document.getElementById('player-hand');
    const deckCountEl = document.getElementById('deck-count');
    const messageEl = document.getElementById('message-area');
    const selectionGridEl = document.getElementById('selection-grid');

    // --- URL State Management ---

    function getUrlState() {
        const params = new URLSearchParams(window.location.search);
        return {
            player: params.get('player') || "",
            dealer: params.get('dealer') || "",
            // selections: params.get('selections') || ""
        };
    }

    function updateUrlState() {
        const params = new URLSearchParams();
        params.set('player', playerHand.map(c => c.code).join(''));
        params.set('dealer', dealerHand.map(c => c.code).join(''));
        // params.set('selections', selectionsHistory);

        const newUrl = `${window.location.pathname}?${params.toString()}`;
        window.history.replaceState({}, '', newUrl);
    }

    // --- Deck & Card Logic ---

    function initDeck() {
        deck = [];
        for (let s of suits) {
            for (let r of ranks) {
                deck.push({
                    code: r + s,
                    rank: r,
                    suit: s,
                    color: (s === 'h' || s === 'd') ? 'red' : 'black'
                });
            }
        }
    }

    function shuffleDeck() {
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
    }

    function removeCardsFromDeck(cardsToRemove) {
        const codesToRemove = new Set(cardsToRemove.map(c => c.code));
        deck = deck.filter(c => !codesToRemove.has(c.code));
    }

    function parseCardCode(code) {
        if (code.length !== 2) return null;
        const r = code[0];
        const s = code[1];
        const color = (s === 'h' || s === 'd') ? 'red' : 'black';
        return { code, rank: r, suit: s, color };
    }

    function parseHandString(str) {
        const hand = [];
        for (let i = 0; i < str.length; i += 2) {
            const code = str.substring(i, i + 2);
            const card = parseCardCode(code);
            if (card) hand.push(card);
        }
        return hand;
    }

    function renderCard(card) {
        const el = document.createElement('div');
        el.className = `card ${card.color}`;
        el.textContent = `${card.rank}${suitSymbols[card.suit]}`;
        return el;
    }

    // --- Grid UI & Interaction ---

    let isDragging = false;
    let dragStart = { r: 0, c: 0 };
    let dragCurrent = { r: 0, c: 0 };
    let dragTargetState = true; // true = select, false = deselect
    let ignoreClick = false;

    function initGrid() {
        selectionGridEl.innerHTML = '';

        suits.forEach((s, rowIdx) => {
            ranks.forEach((r, colIdx) => {
                const code = r + s;
                const cell = document.createElement('div');
                cell.className = 'grid-cell';
                if (s === 'h' || s === 'd') cell.classList.add('red');
                cell.dataset.code = code;
                cell.dataset.row = rowIdx;
                cell.dataset.col = colIdx;
                cell.textContent = `${r}${suitSymbols[s]}`;

                // Interaction
                cell.addEventListener('mousedown', (e) => {
                    isDragging = true;
                    dragStart = { r: rowIdx, c: colIdx };
                    dragCurrent = { r: rowIdx, c: colIdx };

                    const isSelected = currentSelection.has(code);
                    dragTargetState = !isSelected;

                    updatePreview();
                    ignoreClick = true;
                    e.preventDefault();
                });

                cell.addEventListener('click', (e) => {
                    if (ignoreClick) {
                        ignoreClick = false;
                        return;
                    }
                    const isSelected = currentSelection.has(code);
                    updateCellState(cell, code, !isSelected);
                });

                selectionGridEl.appendChild(cell);
            });
        });

        // Global mouse move to handle dragging outside the grid
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;

            // Calculate cell under mouse
            // We need the grid's bounding rect and cell dimensions
            // Or simpler: use document.elementFromPoint? 
            // elementFromPoint might return the grid container or body if outside.
            // Better: Calculate relative position.

            const gridRect = selectionGridEl.getBoundingClientRect();

            // Grid is 13 cols x 4 rows.
            // We can estimate the cell width/height or just clamp based on percentage?
            // Actually, we know the grid layout.
            // Let's assume uniform cell sizes.

            const relativeX = e.clientX - gridRect.left;
            const relativeY = e.clientY - gridRect.top;

            const cellWidth = gridRect.width / 13;
            const cellHeight = gridRect.height / 4;

            let col = Math.floor(relativeX / cellWidth);
            let row = Math.floor(relativeY / cellHeight);

            // Clamp to grid bounds
            col = Math.max(0, Math.min(12, col));
            row = Math.max(0, Math.min(3, row));

            if (dragCurrent.r !== row || dragCurrent.c !== col) {
                dragCurrent = { r: row, c: col };
                updatePreview();
            }
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                applyBoxSelection();
                isDragging = false;
                clearPreview();
            }
        });
    }

    function updatePreview() {
        const rMin = Math.min(dragStart.r, dragCurrent.r);
        const rMax = Math.max(dragStart.r, dragCurrent.r);
        const cMin = Math.min(dragStart.c, dragCurrent.c);
        const cMax = Math.max(dragStart.c, dragCurrent.c);

        const cells = selectionGridEl.querySelectorAll('.grid-cell');
        cells.forEach(cell => {
            const r = parseInt(cell.dataset.row);
            const c = parseInt(cell.dataset.col);
            if (r >= rMin && r <= rMax && c >= cMin && c <= cMax) {
                cell.classList.add('preview-selected');
            } else {
                cell.classList.remove('preview-selected');
            }
        });
    }

    function clearPreview() {
        const cells = selectionGridEl.querySelectorAll('.grid-cell');
        cells.forEach(cell => cell.classList.remove('preview-selected'));
    }

    function applyBoxSelection() {
        const rMin = Math.min(dragStart.r, dragCurrent.r);
        const rMax = Math.max(dragStart.r, dragCurrent.r);
        const cMin = Math.min(dragStart.c, dragCurrent.c);
        const cMax = Math.max(dragStart.c, dragCurrent.c);

        const cells = selectionGridEl.querySelectorAll('.grid-cell');
        cells.forEach(cell => {
            const r = parseInt(cell.dataset.row);
            const c = parseInt(cell.dataset.col);
            const code = cell.dataset.code;

            if (r >= rMin && r <= rMax && c >= cMin && c <= cMax) {
                if (dragTargetState) {
                    currentSelection.add(code);
                    cell.classList.add('selected');
                } else {
                    currentSelection.delete(code);
                    cell.classList.remove('selected');
                }
            }
        });
    }

    function updateCellState(cell, code, state) {
        // Helper kept for compatibility if needed, but applyBoxSelection handles it directly now.
        if (state) {
            currentSelection.add(code);
            cell.classList.add('selected');
        } else {
            currentSelection.delete(code);
            cell.classList.remove('selected');
        }
    }

    function renderGrid() {
        // Sync grid UI with currentSelection
        const cells = selectionGridEl.querySelectorAll('.grid-cell');
        cells.forEach(cell => {
            const code = cell.dataset.code;
            if (currentSelection.has(code)) {
                cell.classList.add('selected');
            } else {
                cell.classList.remove('selected');
            }
        });
    }

    // --- Encoding / Decoding ---

    // We have 52 cards. We need to encode the subset.
    // Order: s(2-A), h(2-A), d(2-A), c(2-A)
    // Total 52 bits.
    // We can use BigInt to hold the mask and convert to Base36.

    function getOrderedCards() {
        const ordered = [];
        for (let s of suits) {
            for (let r of ranks) {
                ordered.push(r + s);
            }
        }
        return ordered;
    }

    const orderedCards = getOrderedCards();

    function encodeSelection(selectionSet) {
        let mask = 0n;
        for (let i = 0; i < orderedCards.length; i++) {
            if (selectionSet.has(orderedCards[i])) {
                mask |= (1n << BigInt(i));
            }
        }
        return mask.toString(36) + "."; // Use dot as separator if needed, or just length?
        // Base36 string length varies. We need a delimiter if we concatenate multiple turns.
        // Let's use a dot '.' delimiter.
    }

    function decodeSelection(str) {
        // str is a Base36 string
        // Wait, if we use dot delimiter, we pass just the segment here?
        // No, the history is a concatenated string.
        // We need to parse the history string into a list of masks?
        // Actually, we only need to decode the current selection if we were "replaying" or if we stored the current selection in URL.
        // The prompt says "save the selected subset for each turn".
        // So `selections` param is a history.
        // But we don't really use the history to restore the *current* grid state, 
        // unless we assume the last entry in history is the current state?
        // Or maybe the user just wants the history stored.
        // Let's assume we don't need to restore the grid state from history for now, 
        // just start with empty or default?
        // Actually, it's nice to restore the last used selection.
        // Let's try to parse the last segment.
        return new Set(); // Placeholder if we don't restore
    }

    // --- Main Render ---

    function render() {
        dealerHandEl.innerHTML = '';
        dealerHand.forEach(c => dealerHandEl.appendChild(renderCard(c)));

        playerHandEl.innerHTML = '';
        playerHand.forEach(c => playerHandEl.appendChild(renderCard(c)));

        deckCountEl.textContent = deck.length;
        renderGrid();

        // Update Ranks
        const playerBest = PokerLogic.getBestHand(playerHand);
        const dealerBest = PokerLogic.getBestHand(dealerHand);

        document.getElementById('player-rank').textContent = playerBest.name;
        document.getElementById('dealer-rank').textContent = dealerBest.name;

        if (gameOver) return; // Don't overwrite game over message

        if (playerHand.length >= 5) {
            endGame();
        } else if (deck.length === 0) {
            messageEl.textContent = "GAME OVER (Deck Empty)";
            gameOver = true;
        } else {
            messageEl.textContent = "";
            gameOver = false;
        }
    }

    function endGame() {
        gameOver = true;

        // Dealer draws to 8
        while (dealerHand.length < 8 && deck.length > 0) {
            dealerHand.push(deck.pop());
        }

        // Re-render to show dealer's new cards
        dealerHandEl.innerHTML = '';
        dealerHand.forEach(c => dealerHandEl.appendChild(renderCard(c)));
        deckCountEl.textContent = deck.length;

        // Final Evaluation
        const playerBest = PokerLogic.getBestHand(playerHand);
        const dealerBest = PokerLogic.getBestHand(dealerHand);

        document.getElementById('player-rank').textContent = playerBest.name;
        document.getElementById('dealer-rank').textContent = dealerBest.name;

        let msg = "";
        if (playerBest.score > dealerBest.score) {
            msg = `YOU WIN! ${playerBest.name} beats ${dealerBest.name}`;
        } else if (playerBest.score < dealerBest.score) {
            msg = `YOU LOSE! ${dealerBest.name} beats ${playerBest.name}`;
        } else {
            msg = `IT'S A TIE! ${playerBest.name}`;
        }
        messageEl.textContent = msg;
        document.getElementById('new-game-btn').style.display = 'block';

        // Update URL one last time
        updateUrlState();
    }

    // --- Initialization ---

    // --- Initialization ---

    initDeck();
    initGrid();

    const state = getUrlState();
    if (state.player || state.dealer) {
        playerHand = parseHandString(state.player);
        dealerHand = parseHandString(state.dealer);
        selectionsHistory = state.selections;
        removeCardsFromDeck([...playerHand, ...dealerHand]);
        shuffleDeck();

        // Try to restore grid from last selection in history?
        // Restore grid from last hex
        if (selectionsHistory) {
            const parts = selectionsHistory.split('-').filter(p => p);
            if (parts.length > 0) {
                const lastHex = parts[parts.length - 1];
                try {
                    let mask = BigInt("0x" + lastHex);
                    currentSelection.clear();
                    for (let i = 0; i < orderedCards.length; i++) {
                        if (mask & (1n << BigInt(i))) {
                            currentSelection.add(orderedCards[i]);
                        }
                    }
                } catch (e) { console.error(e); }
            }
        }

        // Check if game was already over
        if (playerHand.length >= 5) {
            // Re-evaluate end game state without drawing more cards if already saved?
            // If we re-loaded a finished game, we shouldn't draw more for dealer if they already have 8.
            // But if they have < 8, we might need to finish it.
            // Let's just call render, which calls endGame if player >= 5.
            // endGame checks dealerHand.length < 8.
            // So it should work.
        }
    } else {
        shuffleDeck();
    }

    // Hex Encoding Helper
    function encodeSelectionHex(selectionSet) {
        let mask = 0n;
        for (let i = 0; i < orderedCards.length; i++) {
            if (selectionSet.has(orderedCards[i])) {
                mask |= (1n << BigInt(i));
            }
        }
        return mask.toString(16) + "-"; // Use dash as separator
    }

    render();

    // --- Actions ---

    document.getElementById('draw-one-btn').addEventListener('click', () => {
        if (gameOver) return;
        if (deck.length === 0) return;

        const card = deck.pop();
        selectionsHistory += encodeSelectionHex(currentSelection);

        if (currentSelection.has(card.code)) {
            playerHand.push(card);
        } else {
            dealerHand.push(card);
        }

        updateUrlState();
        render();
    });

    document.getElementById('new-game-btn').addEventListener('click', () => {
        // Clear URL params to restart
        window.location.href = window.location.pathname;
    });
});
