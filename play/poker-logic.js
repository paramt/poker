const PokerLogic = (() => {
    const RANKS = '23456789TJQKA';
    const SUITS = 'shdc';

    function getRankValue(r) {
        return RANKS.indexOf(r);
    }

    function getCardValue(card) {
        return {
            r: getRankValue(card.rank),
            s: card.suit
        };
    }

    // Evaluate the best 5-card hand from any number of cards
    function evaluateHand(cards) {
        if (cards.length === 0) return { score: 0, name: "Empty", type: -1 };

        // If fewer than 5 cards, use the partial evaluation logic (simplified for now, or we can adapt the full logic)
        // The prompt implies we should handle N cards. If N < 5, we can't make a full hand, so we just evaluate what we have.
        // But standard poker hands need 5 cards.
        // Let's stick to the logic: if < 5, we identify the best "partial" hand (Pair, High Card, etc.)

        const values = cards.map(getCardValue).sort((a, b) => a.r - b.r); // Sort by rank ascending
        const ranks = values.map(c => c.r);
        const suits = values.map(c => c.s);

        // 1. Check for Flush and Straight Flush
        // Group by suit
        const suitCounts = {};
        const cardsBySuit = {};
        for (let v of values) {
            suitCounts[v.s] = (suitCounts[v.s] || 0) + 1;
            if (!cardsBySuit[v.s]) cardsBySuit[v.s] = [];
            cardsBySuit[v.s].push(v);
        }

        let flushSuit = null;
        for (let s in suitCounts) {
            if (suitCounts[s] >= 5) {
                flushSuit = s;
                break;
            }
        }

        if (flushSuit) {
            const flushCards = cardsBySuit[flushSuit].sort((a, b) => a.r - b.r);
            const flushRanks = flushCards.map(c => c.r);

            // Check for Straight Flush within flush cards
            // We need to check for 5 consecutive ranks in flushRanks
            // Handle Ace low (0, 1, 2, 3, 12) -> 5-high straight flush

            let bestStraightFlush = null;

            // Check normal straights
            for (let i = flushRanks.length - 1; i >= 4; i--) {
                if (flushRanks[i] - flushRanks[i - 4] === 4) {
                    bestStraightFlush = flushRanks[i]; // Highest rank
                    break;
                }
            }
            // Check wheel (A-2-3-4-5) -> ranks: 0, 1, 2, 3, ... 12
            if (!bestStraightFlush) {
                const hasWheel = [0, 1, 2, 3, 12].every(r => flushRanks.includes(r));
                if (hasWheel) bestStraightFlush = 3; // 5-high
            }

            if (bestStraightFlush !== null) {
                const name = (bestStraightFlush === 12 && [8, 9, 10, 11, 12].every(r => flushRanks.includes(r))) ? "Royal Flush" : "Straight Flush";
                return { score: 8 * Math.pow(16, 5) + bestStraightFlush, name, type: 8 };
            }
        }

        // 2. Check for Quads
        const rankCounts = {};
        for (let r of ranks) {
            rankCounts[r] = (rankCounts[r] || 0) + 1;
        }

        let quads = [];
        let trips = [];
        let pairs = [];
        let singles = [];

        for (let r = 12; r >= 0; r--) { // Iterate high to low
            if (rankCounts[r] === 4) quads.push(r);
            else if (rankCounts[r] === 3) trips.push(r);
            else if (rankCounts[r] === 2) pairs.push(r);
            else if (rankCounts[r] === 1) singles.push(r);
        }

        if (quads.length > 0) {
            const quadRank = quads[0];
            // Find best kicker
            let kicker = -1;
            for (let r = 12; r >= 0; r--) {
                if (r !== quadRank && rankCounts[r] > 0) {
                    kicker = r;
                    break;
                }
            }
            const score = 7 * Math.pow(16, 5) + quadRank * 16 + (kicker === -1 ? 0 : kicker);
            return { score, name: "Four of a Kind", type: 7 };
        }

        // 3. Check for Full House
        if (trips.length > 0 && (trips.length >= 2 || pairs.length > 0)) {
            const tripRank = trips[0];
            let pairRank = -1;

            if (trips.length >= 2) pairRank = trips[1];
            else if (pairs.length > 0) pairRank = pairs[0];

            const score = 6 * Math.pow(16, 5) + tripRank * 16 + pairRank;
            return { score, name: "Full House", type: 6 };
        }

        // 4. Check for Flush (non-straight)
        if (flushSuit) {
            const flushCards = cardsBySuit[flushSuit].sort((a, b) => b.r - a.r); // Descending
            const top5 = flushCards.slice(0, 5).map(c => c.r);
            let score = 5 * Math.pow(16, 5);
            for (let i = 0; i < top5.length; i++) {
                score += top5[i] * Math.pow(16, 4 - i);
            }
            return { score, name: "Flush", type: 5 };
        }

        // 5. Check for Straight
        // Get unique ranks sorted ascending
        const uniqueRanks = [...new Set(ranks)].sort((a, b) => a - b);
        let bestStraight = null;

        for (let i = uniqueRanks.length - 1; i >= 4; i--) {
            if (uniqueRanks[i] - uniqueRanks[i - 4] === 4) {
                bestStraight = uniqueRanks[i];
                break;
            }
        }
        if (!bestStraight) {
            const hasWheel = [0, 1, 2, 3, 12].every(r => uniqueRanks.includes(r));
            if (hasWheel) bestStraight = 3;
        }

        if (bestStraight !== null) {
            return { score: 4 * Math.pow(16, 5) + bestStraight, name: "Straight", type: 4 };
        }

        // 6. Three of a Kind
        if (trips.length > 0) {
            const tripRank = trips[0];
            // Get best two kickers
            const kickers = [];
            for (let r = 12; r >= 0; r--) {
                if (r !== tripRank && rankCounts[r] > 0) {
                    kickers.push(r);
                    if (kickers.length === 2) break;
                }
            }
            let score = 3 * Math.pow(16, 5) + tripRank * Math.pow(16, 2);
            if (kickers.length > 0) score += kickers[0] * 16;
            if (kickers.length > 1) score += kickers[1];
            return { score, name: "Three of a Kind", type: 3 };
        }

        // 7. Two Pair
        if (pairs.length >= 2) {
            const p1 = pairs[0];
            const p2 = pairs[1];
            // Kicker
            let kicker = 0;
            for (let r = 12; r >= 0; r--) {
                if (r !== p1 && r !== p2 && rankCounts[r] > 0) {
                    kicker = r;
                    break;
                }
            }
            const score = 2 * Math.pow(16, 5) + p1 * Math.pow(16, 2) + p2 * 16 + kicker;
            return { score, name: "Two Pair", type: 2 };
        }

        // 8. Pair
        if (pairs.length > 0) {
            const p1 = pairs[0];
            // 3 Kickers
            const kickers = [];
            for (let r = 12; r >= 0; r--) {
                if (r !== p1 && rankCounts[r] > 0) {
                    kickers.push(r);
                    if (kickers.length === 3) break;
                }
            }
            let score = 1 * Math.pow(16, 5) + p1 * Math.pow(16, 3);
            for (let i = 0; i < kickers.length; i++) {
                score += kickers[i] * Math.pow(16, 2 - i);
            }
            return { score, name: "Pair", type: 1 };
        }

        // 9. High Card
        // Top 5 cards
        const topCards = values.map(c => c.r).sort((a, b) => b - a).slice(0, 5);
        let score = 0;
        for (let i = 0; i < topCards.length; i++) {
            score += topCards[i] * Math.pow(16, 4 - i);
        }
        return { score, name: "High Card", type: 0 };
    }

    // Get all combinations of k elements from array
    function getCombinations(array, k) {
        if (k === 0) return [[]];
        if (array.length === 0) return [];

        const first = array[0];
        const rest = array.slice(1);

        const combsWithFirst = getCombinations(rest, k - 1).map(c => [first, ...c]);
        const combsWithoutFirst = getCombinations(rest, k);

        return [...combsWithFirst, ...combsWithoutFirst];
    }

    function getBestHand(cards) {
        return evaluateHand(cards);
    }

    return {
        evaluateHand,
        getBestHand
    };
})();
