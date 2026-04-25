export function parseCssString(css: string) {
    if (!css) return {};
    return css.split(";").reduce((acc, item) => {
        const [key, value] = item.split(":").map(s => s.trim());
        if (key && value) {
            // CSS property-ni camelCase şəklinə çeviririk
            const camelKey = key.replace(/-([a-z])/g, g => g[1].toUpperCase());
            acc[camelKey] = value;
        }
        return acc;
    }, {} as React.CSSProperties);
}
