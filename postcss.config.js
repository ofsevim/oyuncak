export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {
      // Eski cihazlar için geniş prefix desteği
      flexbox: "no-2009",
      grid: "autoplace",
    },
  },
};
