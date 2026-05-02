/* HYPHSWORLD / AMS WEST — Vault Floor Data
   Edit filenames only if your uploaded MP3/MP4 names are different.
   This file keeps floors from going blank even when an asset is missing.
*/

window.HYPHSWORLD_VAULT = {
  brand: {
    name: "HYPHSWORLD",
    label: "AMS WEST",
    tagline: "DO YOU KNOW THE CODE?"
  },

  floors: [
    {
      id: "floor1",
      title: "LEVEL 1",
      subtitle: "QUARANTINE MIXTAPE",
      badge: "RESTORED FLOOR",
      status: "OPEN",
      theme: "quarantine",
      art: "assets/quarantine-mixtape.jpg",
      mp4: "",
      description: "Hidden era pressure. First floor in The Vault.",
      tracks: [
        { title: "Quarantine Mixtape Intro", artist: "Hyph Life", producer: "AMS WEST", file: "music/quarantine-mixtape-intro.mp3" },
        { title: "What’s Hannin", artist: "Hyph Life", producer: "AMS WEST", file: "music/whats-hannin.mp3" },
        { title: "HAM", artist: "Hyph Life", producer: "Hyph Life", file: "music/ham.mp3" },
        { title: "No Trace", artist: "Hyph Life", producer: "AMS WEST", file: "music/no-trace.mp3" }
      ],
      next: "floor2.html",
      casino: "casino.html"
    },
    {
      id: "floor2",
      title: "LEVEL 2",
      subtitle: "HYPHSWORLD 5",
      badge: "CURRENT PRESSURE",
      status: "OPEN",
      theme: "hyphsworld5",
      art: "assets/hyphsworld-5.jpg",
      mp4: "",
      description: "Premium floor. Repeat traffic, featured drops, and rollout heat.",
      tracks: [
        { title: "HYPHSWORLD 5 Intro", artist: "Hyph Life", producer: "AMS WEST", file: "music/hyphsworld-5-intro.mp3" },
        { title: "No Trace", artist: "Hyph Life", producer: "AMS WEST", file: "music/no-trace.mp3" },
        { title: "TIME", artist: "SIXX FIGGAZ x HYPH LIFE", producer: "AMS WEST", file: "music/time.mp3" },
        { title: "In The Streets", artist: "HYPH LIFE x B3LLYGANG HERSCH", producer: "CUZ ZAID", file: "music/in-the-streets.mp3" }
      ],
      next: "casino.html",
      casino: "casino.html"
    }
  ]
};
