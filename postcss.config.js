// Tailwind CSS v4 compiles with Lightning CSS and applies vendor prefixes
// itself, so autoprefixer is no longer part of the chain — running it after
// Tailwind v4 double-prefixes and is explicitly discouraged upstream.
module.exports = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
}
