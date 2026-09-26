(function () {
  "use strict";

  const CONFIG_FILE = "supabase-config.js";
  const CDN = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
  const REFRESH_MS = 6500;
  const WIN_POINTS = 100;
  const TUTORIAL_KEY = "hyphsworld_domino_tutorial_seen_v1";
  const CPU_ID = "__hyphsworld_cpu__";
  const LOCAL_PLAYER_ID = "__hyphsworld_local_player__";

  let sbPromise = null;
  let currentUser = null;
  let activeRoom = null;
  let activeState = null;
  let activeVersion = null;
  let refreshTimer = null;
  let roomViewToken = 0;
  let roomListTimer = null;
  let opponentProfile = null;
  let opponentProfileId = null;
  let opponentProfileRequest = 0;
  let lastRenderedBoard = [];
  let resizeTimer = null;
  let cpuMode = false;
  let cpuTimer = null;
  let pendingPlacement = null;

  function $(id) { return document.getElementById(id); }
  function setText(id, value) { const el = $(id); if (el) el.textContent = value; }
  function safeText(value, fallback) { return String(value || fallback || "").replace(/[<>]/g, "").trim(); }
  function roomCode() { return Math.random().toString(36).replace(/[^a-z0-9]/gi, "").slice(2, 8).toUpperCase(); }
  function readableError(error) { return error && error.message ? error.message : String(error || "Unknown error"); }
  function dominoAvatar(type, fallback) {
    if (String(type || "").toLowerCase() === "girl") return "👩🏾";
    return safeText(fallback, "🧢");
  }

  async function loadOpponentProfile(userId) {
    if (!userId || userId === opponentProfileId) return;
    const request = ++opponentProfileRequest;
    opponentProfileId = userId;
    opponentProfile = null;
    try {
      const sb = await getClient();
      const { data, error } = await sb.from("profiles")
        .select("id,display_name,avatar_type,avatar_icon")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw error;
      if (request !== opponentProfileRequest || opponentProfileId !== userId) return;
      opponentProfile = data || null;
      renderOpponentSeat(userId);
    } catch (error) {
      if (request === opponentProfileRequest) renderOpponentSeat(userId);
    }
  }

  function renderOpponentSeat(opponentId) {
    const name = opponentProfile && opponentProfile.id === opponentId
      ? safeText(opponentProfile.display_name, "PLAYER TWO")
      : "PLAYER TWO";
    setText("povHudName", opponentId ? name : "OPEN SEAT");
    setText("povHudAvatar", opponentId
      ? dominoAvatar(opponentProfile?.avatar_type, opponentProfile?.avatar_icon)
      : "＋");
    const hud = document.querySelector(".pov-player-hud");
    if (hud) hud.classList.toggle("is-female", Boolean(opponentId && opponentProfile?.avatar_type === "girl"));
    const room = document.querySelector(".domino-pov-room");
    if (room) room.classList.toggle("has-female-opponent", Boolean(opponentId && opponentProfile?.avatar_type === "girl"));
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = Array.from(document.scripts).find((script) => script.src && script.src.includes(src));
      if (existing) { existing.addEventListener("load", resolve, { once: true }); setTimeout(resolve, 200); return; }
      const script = document.createElement("script");
      script.src = src;
      script.async = false;
      script.onload = resolve;
      script.onerror = () => reject(new Error("Could not load " + src));
      document.head.appendChild(script);
    });
  }

  function configReady(config) {
    const url = String(config?.url || "").trim();
    const anonKey = String(config?.anonKey || config?.anon_key || "").trim();
    return Boolean(url && anonKey && !/PASTE_|YOUR_|PROJECT_URL|ANON_PUBLIC_KEY/i.test(url + anonKey));
  }

  async function getClient() {
    if (sbPromise) return sbPromise;
    sbPromise = (async () => {
      if (window.HWAuth && typeof window.HWAuth.getClient === "function") {
        const shared = await window.HWAuth.getClient();
        if (shared) return shared;
      }
      if (!window.HW_SUPABASE_CONFIG) await loadScript(CONFIG_FILE);
      const config = window.HW_SUPABASE_CONFIG || {};
      if (!configReady(config)) throw new Error("Supabase config missing.");
      if (!window.supabase || !window.supabase.createClient) await loadScript(CDN);
      if (!window.supabase || !window.supabase.createClient) throw new Error("Supabase client unavailable.");
      return window.supabase.createClient(config.url, config.anonKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
      });
    })();
    return sbPromise;
  }

  function tileScore(tile) { return Number(tile?.[0] || 0) + Number(tile?.[1] || 0); }
  function handScore(hand) { return (hand || []).reduce((total, tile) => total + tileScore(tile), 0); }
  function sameTile(a, b) { return Boolean(a && b && a[0] === b[0] && a[1] === b[1]); }

  function tileText(tile) {
    return Array.isArray(tile) ? `${tile[0]}|${tile[1]}` : "?|?";
  }

  function pipFace(value) {
    const patterns = {
      0: [], 1: [5], 2: [1, 9], 3: [1, 5, 9],
      4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9]
    };
    const dots = patterns[Number(value)] || [];
    return `<span class="pip-face" aria-hidden="true">${dots.map((position) => {
      const row = Math.ceil(position / 3);
      const column = ((position - 1) % 3) + 1;
      return `<i style="grid-area:${row}/${column}"></i>`;
    }).join("")}</span>`;
  }

  function tileColorClass(tile) {
    // A double-six set contains each unordered pair once. Deriving the color
    // from that pair makes the bone keep its identity if the server flips it
    // to connect to the left end or moves it from a hand onto the table.
    const low = Math.min(Number(tile?.[0] || 0), Number(tile?.[1] || 0));
    const high = Math.max(Number(tile?.[0] || 0), Number(tile?.[1] || 0));
    return ` tile-color-${((low * 7) + high) % 6}`;
  }

  function tileMarkup(tile, options) {
    const clickable = Boolean(options && options.clickable);
    const index = options && Number.isInteger(options.index) ? options.index : -1;
    const playable = Boolean(options && options.playable);
    const tag = clickable ? "button" : "span";
    const attrs = clickable
      ? ` type="button" data-tile-index="${index}" ${playable ? "" : "disabled aria-disabled=\"true\""}`
      : ` role="img"`;
    const extraClass = options && options.className ? ` ${options.className}` : "";
    const style = options && options.style ? ` style="${options.style}"` : "";
    const classes = `domino-tile${tileColorClass(tile)}${tile[0] === tile[1] ? " is-double" : ""}${clickable ? " tile-button" : ""}${playable ? " is-playable" : " is-blocked"}${extraClass}`;
    return `<${tag} class="${classes}"${attrs}${style} aria-label="Domino ${tileText(tile)}">${pipFace(tile[0])}${pipFace(tile[1])}</${tag}>`;
  }

  function tileSequenceMatches(left, right) {
    return left.length === right.length && left.every((tile, index) => sameTile(tile, right[index]));
  }

  function addedTileIndex(previous, next) {
    if (tileSequenceMatches(previous, next)) return -1;
    if (next.length !== previous.length + 1) return next.length ? next.length - 1 : -1;
    if (tileSequenceMatches(previous, next.slice(1))) return 0;
    if (tileSequenceMatches(previous, next.slice(0, -1))) return next.length - 1;
    return next.length - 1;
  }

  function boardChainMarkup(tiles, boardWidth, animateIndex) {
    const compactBoard = (Number(boardWidth) || 420) < 430;
    const tileWidth = compactBoard ? 42 : 54;
    const tileHeight = compactBoard ? 26 : 32;
    const uprightWidth = tileHeight;
    const overlap = 2;
    const rotationInset = (tileWidth - uprightWidth) / 2;
    // Keep longer runs on narrow tables so turns stay readable instead of
    // stacking oversized bones into the center of the felt.
    const runStep = tileWidth - overlap;
    const run = Math.max(7, Math.min(10, Math.floor(((Number(boardWidth) || 420) - 20) / runStep)));

    let direction = 1;
    let connectorX = 0;
    let rowCenter = tileWidth / 2;
    let rowCount = 0;
    const placements = [];

    tiles.forEach((tile, index) => {
      const isDouble = Number(tile[0]) === Number(tile[1]);
      // A boundary double is symmetric, so it can safely serve as the
      // connected corner instead of stacking beside a second vertical bone.
      const isTurn = rowCount >= run;
      const rotation = isTurn || isDouble ? 90 : (direction < 0 ? 180 : 0);
      const isQuarterTurn = Math.abs(rotation) === 90;
      const visualWidth = isQuarterTurn ? uprightWidth : tileWidth;
      const visualHeight = isQuarterTurn ? tileWidth : tileHeight;
      let visualLeft;
      let visualTop;

      if (isTurn) {
        // Both rows share this bone's center line: its top overlaps the
        // outgoing row and its bottom overlaps the returning row.
        visualLeft = connectorX - (uprightWidth / 2);
        visualTop = rowCenter - overlap;
      } else if (direction > 0) {
        visualLeft = connectorX - (index === 0 ? 0 : overlap);
        visualTop = rowCenter - (visualHeight / 2);
        connectorX = visualLeft + visualWidth;
      } else {
        visualLeft = connectorX + overlap - visualWidth;
        visualTop = rowCenter - (visualHeight / 2);
        connectorX = visualLeft;
      }

      const x = visualLeft - (isQuarterTurn ? rotationInset : 0);
      const y = visualTop + (isQuarterTurn ? rotationInset : 0);
      placements.push({
        tile, index, x, y, rotation, isTurn,
        visualLeft,
        visualRight: visualLeft + visualWidth,
        visualTop,
        visualBottom: visualTop + visualHeight
      });

      if (isTurn) {
        rowCenter = visualTop + visualHeight - overlap;
        direction *= -1;
        rowCount = 0;
      } else {
        rowCount += 1;
      }
    });

    const minX = Math.min(0, ...placements.map((item) => item.visualLeft));
    const maxX = Math.max(tileWidth, ...placements.map((item) => item.visualRight));
    const minY = Math.min(0, ...placements.map((item) => item.visualTop));
    const maxY = Math.max(86, ...placements.map((item) => item.visualBottom));
    const padding = 14;
    const shiftX = padding - minX;
    const shiftY = padding - minY;
    const width = Math.ceil(maxX - minX + (padding * 2));
    const height = Math.ceil(maxY - minY + (padding * 2));

    const bones = placements.map(({ tile, index, x, y, rotation, isTurn }) => {
      const endClass = index === 0 ? " chain-left-end" : index === tiles.length - 1 ? " chain-right-end" : "";
      const animationClass = index === animateIndex ? " chain-new" : "";
      return tileMarkup(tile, {
        className: `chain-bone${isTurn ? " chain-turn" : ""}${tile[0] === tile[1] ? " chain-double" : ""}${endClass}${animationClass}`,
        style: `--chain-index:${index};--chain-bone-width:${tileWidth}px;--chain-bone-height:${tileHeight}px;left:${x + shiftX}px;top:${y + shiftY}px;transform:rotate(${rotation}deg)`
      });
    }).join("");

    const targetHeight = Number(boardWidth) < 430 ? 300 : 340;
    const scale = Math.max(0.56, Math.min(0.94, ((Number(boardWidth) || width) - 8) / width, targetHeight / height));
    const renderedWidth = Math.ceil(width * scale);
    const renderedHeight = Math.ceil(height * scale);
    return `<div class="domino-chain-viewport" style="width:${renderedWidth}px;height:${renderedHeight}px;min-width:${renderedWidth}px;min-height:${renderedHeight}px"><div class="domino-chain-stage" style="--chain-width:${width}px;--chain-height:${height}px;--chain-scale:${scale};width:${width}px;height:${height}px;min-width:${width}px;min-height:${height}px" role="group" aria-label="Connected domino chain with ${tiles.length} played ${tiles.length === 1 ? "bone" : "bones"}">${bones}</div></div>`;
  }

  function keepPlayedEndVisible(board) {
    const end = board && board.querySelector(".chain-right-end");
    if (!end || typeof board.scrollTo !== "function") return;
    window.requestAnimationFrame(() => {
      const boardRect = board.getBoundingClientRect();
      const endRect = end.getBoundingClientRect();
      const left = Math.max(0, board.scrollLeft + (endRect.left - boardRect.left) - ((board.clientWidth - endRect.width) / 2));
      const top = Math.max(0, board.scrollTop + (endRect.top - boardRect.top) - ((board.clientHeight - endRect.height) / 2));
      board.scrollTo({ left, top, behavior: "smooth" });
    });
  }

  function canPlay(tile, board) {
    if (activeState && board === activeState.board) return legalSides(tile, activeState).length > 0;
    if (!board || !board.length) return true;
    const left = board[0][0];
    const right = board[board.length - 1][1];
    return tile.includes(left) || tile.includes(right);
  }

  function setStatus(message) { setText("dominosStatus", message); }

  function tutorialSeen() {
    try { return window.localStorage.getItem(TUTORIAL_KEY) === "1"; } catch (error) { return false; }
  }

  function openTutorial() {
    const tutorial = $("dominoTutorial");
    if (!tutorial) return;
    tutorial.hidden = false;
    document.body.classList.add("domino-tutorial-open");
    const close = $("closeDominoTutorial");
    if (close) close.focus();
  }

  function closeTutorial() {
    const tutorial = $("dominoTutorial");
    if (!tutorial) return;
    tutorial.hidden = true;
    document.body.classList.remove("domino-tutorial-open");
    try { window.localStorage.setItem(TUTORIAL_KEY, "1"); } catch (error) {}
    const open = $("openDominoTutorial");
    if (open) open.focus();
  }

  function setCoach(message) { setText("povCoach", message); }

  function setGuestControls(enabled) {
    document.querySelectorAll("#createRoomForm input, #createRoomForm button, #joinRoomForm input, #joinRoomForm button").forEach((control) => {
      control.disabled = !enabled;
    });
    if (!activeRoom) {
      ["drawTileBtn", "passTurnBtn", "submitWinBtn", "leaveRoomBtn"].forEach((id) => {
        const control = $(id);
        if (control) control.disabled = true;
      });
    }
  }

  function initTableRadio() {
    const audio = $("dominoRadioAudio");
    const track = $("dominoRadioTrack");
    const nowPlaying = $("dominoRadioNowPlaying");
    if (!audio || !track) return;
    track.addEventListener("change", () => {
      const selected = track.options[track.selectedIndex];
      audio.pause();
      audio.src = selected.value;
      audio.load();
      if (nowPlaying) nowPlaying.textContent = selected.dataset.title || selected.textContent;
    });
    audio.addEventListener("error", () => {
      if (nowPlaying) nowPlaying.textContent = "TRACK UNAVAILABLE — CHOOSE ANOTHER SONG";
    });
  }

  async function requireUser() {
    if (!window.HWAuth) throw new Error("Auth unavailable.");
    const user = await window.HWAuth.getCurrentUser();
    if (!user || !user.userId) throw new Error("Login required to play.");
    currentUser = user;
    const authLink = $("dominosAuthLink");
    if (authLink) { authLink.textContent = "Manage ID"; authLink.href = "account.html"; }
    return user;
  }

  async function listRooms() {
    const list = $("roomList");
    if (!list) return;
    if (!currentUser || currentUser.userId === LOCAL_PLAYER_ID) {
      list.innerHTML = `<div class="hw-leaderboard-empty">Login to view and join live tables.</div>`;
      return;
    }
    const sb = await getClient();
    const { data, error } = await sb.rpc("list_domino_rooms");

    if (error) {
      list.innerHTML = `<div class="hw-leaderboard-empty">Could not load tables: ${safeText(error.message, "Supabase error")}</div>`;
      return;
    }

    const rooms = data && Array.isArray(data.rooms) ? data.rooms : [];
    if (!rooms.length) {
      list.innerHTML = `<div class="hw-leaderboard-empty">No open tables yet. Create one.</div>`;
      return;
    }

    list.innerHTML = rooms.map((room) => `
      <article class="room-row">
        <div><strong>${safeText(room.room_code, "ROOM")}</strong><span>${safeText(room.status, "waiting")} • ${Number(room.player_count || 0)}/2 players</span></div>
        <button class="games-btn" type="button" data-join-code="${safeText(room.room_code, "")}">${Number(room.player_count || 0) >= 2 ? "Rejoin" : "Join"}</button>
      </article>
    `).join("");

    list.querySelectorAll("[data-join-code]").forEach((button) => {
      button.addEventListener("click", () => joinRoomByCodeValue(button.getAttribute("data-join-code")));
    });
  }


  function createDoubleSixDeck() {
    const deck = [];
    for (let low = 0; low <= 6; low += 1) {
      for (let high = low; high <= 6; high += 1) deck.push([low, high]);
    }
    return deck;
  }

  function shuffledCopy(tiles) {
    const copy = tiles.map((tile) => [tile[0], tile[1]]);
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
    }
    return copy;
  }

  function handRank(hand) {
    return (hand || []).reduce((best, tile) => {
      const score = Number(tile[0]) === Number(tile[1]) ? 100 + Number(tile[0]) : tileScore(tile);
      return Math.max(best, score);
    }, -1);
  }

  function openingBone(hand) {
    return (hand || []).slice().sort((left, right) => {
      const rightRank = Number(right[0]) === Number(right[1]) ? 100 + Number(right[0]) : tileScore(right);
      const leftRank = Number(left[0]) === Number(left[1]) ? 100 + Number(left[0]) : tileScore(left);
      return rightRank - leftRank;
    })[0] || null;
  }

  function connectedBoard(board, tile, requestedSide) {
    const next = (board || []).map((bone) => [bone[0], bone[1]]);
    const played = [Number(tile[0]), Number(tile[1])];
    if (!next.length) return [played];
    const left = Number(next[0][0]);
    const right = Number(next[next.length - 1][1]);
    const a = played[0];
    const b = played[1];
    const canLeft = a === left || b === left;
    const canRight = a === right || b === right;
    const side = requestedSide === "right" && canRight ? "right" : requestedSide === "left" && canLeft ? "left" : canLeft ? "left" : "right";
    if (side === "left" && b === left) next.unshift(played);
    else if (side === "left" && a === left) next.unshift([b, a]);
    else if (side === "right" && a === right) next.push(played);
    else if (side === "right" && b === right) next.push([b, a]);
    return next;
  }

  function layoutFromBoard(board) {
    const tiles = board || [];
    if (!tiles.length) return null;
    const spinnerIndex = tiles.findIndex((tile) => Number(tile[0]) === Number(tile[1]));
    if (spinnerIndex < 0) return {
      mode: "chain", chain: tiles.map((tile) => [...tile]),
      openEnds: { left: Number(tiles[0][0]), right: Number(tiles[tiles.length - 1][1]) }
    };
    const spinner = Number(tiles[spinnerIndex][0]);
    return {
      mode: "spinner", spinnerTile: [spinner, spinner],
      branches: {
        left: tiles.slice(0, spinnerIndex).reverse().map((tile) => [Number(tile[1]), Number(tile[0])]),
        right: tiles.slice(spinnerIndex + 1).map((tile) => [...tile]), top: [], bottom: []
      },
      openEnds: {
        left: spinnerIndex ? Number(tiles[0][0]) : spinner,
        right: spinnerIndex < tiles.length - 1 ? Number(tiles[tiles.length - 1][1]) : spinner,
        top: spinner, bottom: spinner
      }
    };
  }

  function activeLayout(state) {
    return state?.layout || layoutFromBoard(state?.board || []);
  }

  function legalSides(tile, state) {
    const board = state?.board || [];
    if (!board.length) return !state?.openingTile || sameTile(tile, state.openingTile) ? ["center"] : [];
    const layout = activeLayout(state);
    const sides = layout?.mode === "spinner" ? ["left", "right", "top", "bottom"] : ["left", "right"];
    return sides.filter((side) => tile.includes(Number(layout.openEnds[side])));
  }

  function spinnerBoardMarkup(layout, boardWidth, animateTile) {
    const branches = layout?.branches || {};
    const tileWidth = boardWidth < 430 ? 42 : 52;
    const tileHeight = boardWidth < 430 ? 26 : 32;
    const centerX = Math.max(150, boardWidth / 2);
    const centerY = boardWidth < 430 ? 142 : 160;
    const gapX = tileWidth - 1;
    const gapY = tileWidth - 1;
    const pieces = [tileMarkup(layout.spinnerTile, { className: "chain-bone spinner-bone", style: `--chain-bone-width:${tileWidth}px;--chain-bone-height:${tileHeight}px;left:${centerX - tileWidth / 2}px;top:${centerY - tileHeight / 2}px` })];
    ["left", "right", "top", "bottom"].forEach((side) => {
      (branches[side] || []).forEach((tile, index) => {
        const horizontal = side === "left" || side === "right";
        const distance = index + 1;
        const x = horizontal ? centerX + (side === "left" ? -distance * gapX - tileWidth / 2 : (distance - 1) * gapX + tileWidth / 2) : centerX - tileWidth / 2;
        const y = horizontal ? centerY - tileHeight / 2 : centerY + (side === "top" ? -distance * gapY : distance * gapY) - tileHeight / 2;
        const rotation = horizontal ? (side === "left" ? 180 : 0) : (side === "top" ? -90 : 90);
        const newest = animateTile && sameTile(tile, animateTile) && index === (branches[side] || []).length - 1;
        pieces.push(tileMarkup(tile, { className: `chain-bone spinner-branch spinner-${side}${newest ? " chain-new" : ""}`, style: `--chain-bone-width:${tileWidth}px;--chain-bone-height:${tileHeight}px;left:${x}px;top:${y}px;transform:rotate(${rotation}deg)` }));
      });
    });
    const maxHorizontal = Math.max((branches.left || []).length, (branches.right || []).length, 1);
    const maxVertical = Math.max((branches.top || []).length, (branches.bottom || []).length, 1);
    const naturalWidth = Math.max(boardWidth, (maxHorizontal * 2 + 1) * gapX + 30);
    const naturalHeight = Math.max(300, (maxVertical * 2 + 1) * gapY + 40);
    const scale = Math.min(1, (boardWidth - 8) / naturalWidth, (boardWidth < 430 ? 300 : 340) / naturalHeight);
    return `<div class="domino-chain-viewport spinner-viewport" style="width:${Math.ceil(naturalWidth * scale)}px;height:${Math.ceil(naturalHeight * scale)}px"><div class="domino-chain-stage spinner-stage" style="--chain-scale:${scale};width:${naturalWidth}px;height:${naturalHeight}px">${pieces.join("")}</div></div>`;
  }

  function applyLocalPlacement(board, tile, state, requestedSide) {
    const sides = legalSides(tile, state);
    const side = sides.includes(requestedSide) ? requestedSide : sides[0];
    if (!side) return false;
    if (!board.length) {
      board.push([Number(tile[0]), Number(tile[1])]);
      state.layout = layoutFromBoard(board);
      return true;
    }
    const layout = activeLayout(state);
    if (layout.mode === "chain") {
      state.board = connectedBoard(board, tile, side);
      state.layout = layoutFromBoard(state.board);
      return true;
    }
    const end = Number(layout.openEnds[side]);
    const oriented = Number(tile[0]) === end ? [Number(tile[0]), Number(tile[1])] : [Number(tile[1]), Number(tile[0])];
    layout.branches[side] = [...(layout.branches[side] || []), oriented];
    layout.openEnds[side] = oriented[1];
    state.layout = layout;
    board.push([Number(tile[0]), Number(tile[1])]);
    return true;
  }

  function cpuPlayableIndexes(hand, state) {
    return (hand || []).reduce((indexes, tile, index) => {
      if (legalSides(tile, state).length) indexes.push(index);
      return indexes;
    }, []);
  }

