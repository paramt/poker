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

    // Evaluate a hand of up to 5 cards
    function evaluateHand(cards) {
        if (cards.length === 0) return { score: 0, name: "Empty", type: -1 };

        const values = cards.map(getCardValue).sort((a, b) => a.r - b.r);
        const ranks = values.map(c => c.r);
        const suits = values.map(c => c.s);

        // Flush and Straight require at least 5 cards
        const canBeFlushOrStraight = cards.length >= 5;

        const isFlush = canBeFlushOrStraight && suits.every(s => s === suits[0]);

        // Check Straight
        let isStraight = false;
        if (canBeFlushOrStraight) {
            isStraight = true;
            for (let i = 0; i < 4; i++) {
                if (ranks[i + 1] !== ranks[i] + 1) {
                    isStraight = false;
                    break;
                }
            }
            // Wheel check (A-2-3-4-5)
            if (!isStraight && ranks[0] === 0 && ranks[1] === 1 && ranks[2] === 2 && ranks[3] === 3 && ranks[4] === 12) {
                isStraight = true;
            }
        }

        const counts = {};
        ranks.forEach(r => counts[r] = (counts[r] || 0) + 1);
        const countValues = Object.values(counts).sort((a, b) => b - a);

        let type = 0;
        let name = "High Card";
        let kickers = [];

        if (isStraight && isFlush) {
            type = 8;
            name = "Straight Flush";
            if (ranks[4] === 12 && ranks[0] === 8) name = "Royal Flush";
            kickers = [ranks[4]];
            if (ranks[4] === 12 && ranks[0] === 0) kickers = [3];
        } else if (countValues[0] === 4) {
            type = 7;
            name = "Four of a Kind";
            const quadRank = parseInt(Object.keys(counts).find(key => counts[key] === 4));
            const kicker = parseInt(Object.keys(counts).find(key => counts[key] === 1)) || 0;
            kickers = [quadRank, kicker];
        } else if (countValues[0] === 3 && countValues[1] >= 2) {
            type = 6;
            name = "Full House";
            const tripRank = parseInt(Object.keys(counts).find(key => counts[key] === 3));
            const pairRank = parseInt(Object.keys(counts).find(key => counts[key] >= 2 && parseInt(key) !== tripRank));
            kickers = [tripRank, pairRank];
        } else if (isFlush) {
            type = 5;
            name = "Flush";
            kickers = [...ranks].reverse();
        } else if (isStraight) {
            type = 4;
            name = "Straight";
            kickers = [ranks[4]];
            if (ranks[4] === 12 && ranks[0] === 0) kickers = [3];
        } else if (countValues[0] === 3) {
            type = 3;
            name = "Three of a Kind";
            const tripRank = parseInt(Object.keys(counts).find(key => counts[key] === 3));
            const others = Object.keys(counts).filter(k => counts[k] === 1).map(Number).sort((a, b) => b - a);
            kickers = [tripRank, ...others];
        } else if (countValues[0] === 2 && countValues[1] === 2) {
            type = 2;
            name = "Two Pair";
            const pairs = Object.keys(counts).filter(k => counts[k] === 2).map(Number).sort((a, b) => b - a);
            const kicker = parseInt(Object.keys(counts).find(key => counts[key] === 1)) || 0;
            kickers = [...pairs, kicker];
        } else if (countValues[0] === 2) {
            type = 1;
            name = "Pair";
            const pairRank = parseInt(Object.keys(counts).find(key => counts[key] === 2));
            const others = Object.keys(counts).filter(k => counts[k] === 1).map(Number).sort((a, b) => b - a);
            kickers = [pairRank, ...others];
        } else {
            type = 0;
            name = "High Card";
            kickers = [...ranks].reverse();
        }

        // Calculate numeric score
        let score = type * Math.pow(16, 5);
        for (let i = 0; i < kickers.length; i++) {
            score += kickers[i] * Math.pow(16, 4 - i);
        }

        return { score, name, type };
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
        if (cards.length < 5) {
            // Evaluate the partial hand directly
            return evaluateHand(cards);
        }

        const combinations = getCombinations(cards, 5);
        let best = { score: -2, name: "Invalid" };

        for (let combo of combinations) {
            const result = evaluateHand(combo);
            if (result.score > best.score) {
                best = result;
            }
        }
        return best;
    }

    return {
        evaluateHand,
        getBestHand
    };
})();
