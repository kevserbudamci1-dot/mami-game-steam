require("dotenv").config();

const express = require("express");
const session = require("express-session");
const passport = require("passport");
const SteamStrategy = require("passport-steam").Strategy;
const helmet = require("helmet");

const app = express();
const BASE_URL = process.env.BASE_URL;
const PORT = process.env.PORT || 3000;

app.set("trust proxy", 1);
app.use(helmet());

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  }
}));

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

passport.use(new SteamStrategy({
  returnURL: BASE_URL + "/auth/steam/return",
  realm: BASE_URL + "/",
  apiKey: process.env.STEAM_API_KEY
}, (identifier, profile, done) => {
  done(null, {
    id: profile.id,
    name: profile.displayName,
    avatar: profile.photos?.[2]?.value || ""
  });
}));

app.get("/auth/steam",
  passport.authenticate("steam")
);

app.get("/auth/steam/return",
  passport.authenticate("steam", {
    failureRedirect: "/"
  }),
  (req, res) => res.redirect("/")
);

app.get("/api/me", (req, res) => {
  res.json({
    loggedIn: !!req.user,
    user: req.user || null
  });
});

app.get("/api/games", async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Giriş gerekli" });
  }

  try {
    const url = new URL(
      "https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/"
    );

    url.search = new URLSearchParams({
      key: process.env.STEAM_API_KEY,
      steamid: req.user.id,
      include_appinfo: "true",
      include_played_free_games: "true"
    });

    const response = await fetch(url);
    const data = await response.json();

    res.json(data.response?.games || []);
  } catch (error) {
    res.status(500).json({ error: "Oyunlar alınamadı" });
  }
});

app.use(express.static("public"));

app.listen(PORT, () => {
  console.log("Mami Cloud Gaming çalışıyor!");
});
