// CSV parsing and word utilities
export const csv = {
    CSV_URL: 'words.csv',

    // Parse CSV data into array of word objects
    parse(csvText) {
        const lines = csvText.trim().split('\n');
        const words = [];
        
        for (let line of lines) {
            const [swedish, english] = line.split(',').map(s => s.trim());
            if (swedish && english) {
                words.push({ swedish, english });
            }
        }
        
        return words;
    },

    // Fetch words from CSV
    async fetch() {
        try {
            const response = await fetch(this.CSV_URL);
            const csvText = await response.text();
            return this.parse(csvText);
        } catch (error) {
            console.error('Error fetching words:', error);
            return null;
        }
    },

    // Shuffle array using Fisher-Yates algorithm
    shuffle(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
};
