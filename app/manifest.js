export default function manifest() {
  return {
    name: "Nestora",
    short_name: "Nestora",
    description: "Find your place. Feel at home.",
    start_url: "/",
    display: "standalone",
    background_color: "#f8f5ef",
    theme_color: "#173f35",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
