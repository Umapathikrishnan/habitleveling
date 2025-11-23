export const getRankColor = (level: number): [string, string] => {
    if (level < 10) return ['#2c3e50', '#000000']; // E-Rank
    if (level < 20) return ['#2980b9', '#2c3e50']; // D-Rank
    if (level < 30) return ['#27ae60', '#2980b9']; // C-Rank
    if (level < 40) return ['#f1c40f', '#d35400']; // B-Rank
    if (level < 50) return ['#e74c3c', '#c0392b']; // A-Rank
    return ['#8e44ad', '#2c3e50']; // S-Rank
};
