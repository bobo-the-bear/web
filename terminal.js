(function () {
  "use strict";

  const BOBO_MINT = "4nV5gNwwP68zUDat26ySChREqVaQaLudfJBkSgEzpump";
  const PAIR = "31zmtzeufrdbgksj7nicckekxtpqgaemqvdbcuufe6gx";
  const PUMPSWAP_API_ORIGIN = /(^|\.)bobothebear\.io$/i.test(window.location.hostname)
    ? "https://bobo-swap.tekashitrades.chatgpt.site"
    : "";
  const TOKENS = {
    SOL: { symbol: "SOL", name: "Solana", decimals: 9 },
    BOBO: { symbol: "BOBO", name: "Bobo the Bear", decimals: 6 },
  };

  function pumpApi(path) {
    return PUMPSWAP_API_ORIGIN + "/api/pumpswap" + (path || "");
  }

  const form = document.getElementById("swapForm");
  const inputAmount = document.getElementById("inputAmount");
  const outputAmount = document.getElementById("outputAmount");
  const inputToken = document.getElementById("inputToken");
  const outputToken = document.getElementById("outputToken");
  const inputTokenIcon = document.getElementById("inputTokenIcon");
  const outputTokenIcon = document.getElementById("outputTokenIcon");
  const inputCaption = document.getElementById("inputCaption");
  const outputCaption = document.getElementById("outputCaption");
  const minimumOutput = document.getElementById("minimumOutput");
  const routeLabel = document.getElementById("routeLabel");
  const routeDirection = document.getElementById("routeDirection");
  const priceImpact = document.getElementById("priceImpact");
  const slippage = document.getElementById("slippage");
  const slippageLabel = document.getElementById("slippageLabel");
  const swapButton = document.getElementById("swapButton");
  const connectButton = document.getElementById("connectWallet");
  const walletState = document.getElementById("walletState");
  const walletHoldings = document.getElementById("walletHoldings");
  const boboWalletBalance = document.getElementById("boboWalletBalance");
  const walletNodeState = document.getElementById("walletNodeState");
  const destinationState = document.getElementById("destinationState");
  const status = document.getElementById("swapStatus");
  const raceTrack = document.getElementById("boboRaceTrack");
  const racer = document.getElementById("boboRacer");
  const raceStatus = document.getElementById("boboRaceStatus");
  const reviewOverlay = document.getElementById("reviewOverlay");
  const reviewPay = document.getElementById("reviewPay");
  const reviewReceive = document.getElementById("reviewReceive");
  const reviewSlippage = document.getElementById("reviewSlippage");
  const reviewCancel = document.getElementById("reviewCancel");
  const reviewConfirm = document.getElementById("reviewConfirm");
  const successOverlay = document.getElementById("successOverlay");
  const successClose = document.getElementById("successClose");
  const successAmountLabel = document.getElementById("successAmountLabel");
  const successBoboAmount = document.getElementById("successBoboAmount");
  const successWalletBalance = document.getElementById("successWalletBalance");
  const successSolscan = document.getElementById("successSolscan");
  const RACER_FRAMES = {
    idle: "images/bobo-racer-idle.png",
    driveA: "images/bobo-racer-drive-a.png",
    driveB: "images/bobo-racer-drive-b.png",
    victory: "images/bobo-racer-victory.png",
  };

  let inputSymbol = "SOL";
  let outputSymbol = "BOBO";
  let walletProvider = null;
  let walletAddress = "";
  let quoteTimer = 0;
  let quoteRequest = 0;
  let outputAnimation = 0;
  let activeQuote = null;
  let busy = false;
  let submitted = false;
  let racerStage = 0;
  let racerTargetStage = 0;
  let racerFrameTimer = 0;
  let racerArrivalTimer = 0;
  let racerResetTimer = 0;
  let racerFrame = false;
  let balanceRequest = 0;
  let walletBoboRaw = "0";
  let reviewResolver = null;

  Object.keys(RACER_FRAMES).forEach(function (key) {
    const image = new Image();
    image.src = RACER_FRAMES[key];
  });

  function stopRacerMotion() {
    window.clearInterval(racerFrameTimer);
    window.clearTimeout(racerArrivalTimer);
    racerFrameTimer = 0;
    racerArrivalTimer = 0;
    racer.classList.remove("is-driving");
  }

  function hideSuccessGraphic() {
    successOverlay.hidden = true;
  }

  function showSuccessGraphic() {
    successOverlay.hidden = false;
    successClose.focus();
  }

  function closeSwapReview(approved) {
    if (reviewOverlay.hidden) return;
    reviewOverlay.hidden = true;
    const resolve = reviewResolver;
    reviewResolver = null;
    if (resolve) resolve(Boolean(approved));
    swapButton.focus();
  }

  function confirmSwapReview(details) {
    reviewPay.textContent = details.pay;
    reviewReceive.textContent = details.receive;
    reviewSlippage.textContent = details.slippage + "%";
    reviewOverlay.hidden = false;
    reviewConfirm.focus();
    return new Promise(function (resolve) {
      reviewResolver = resolve;
    });
  }

  function resetRacer() {
    if (busy) return;
    stopRacerMotion();
    window.clearTimeout(racerResetTimer);
    racerResetTimer = 0;
    racerStage = 0;
    racerTargetStage = 0;
    raceTrack.classList.add("is-resetting");
    raceTrack.dataset.racerStage = "0";
    racer.src = RACER_FRAMES.idle;
    racer.classList.remove("is-victory");
    raceStatus.textContent = "BOBO is waiting at the starting line.";
    hideSuccessGraphic();
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () { raceTrack.classList.remove("is-resetting"); });
    });
  }

  function finishRacerLeg() {
    stopRacerMotion();
    if (racerStage !== racerTargetStage) {
      racer.src = RACER_FRAMES.idle;
      raceStatus.textContent = "BOBO reached transaction step " + (racerStage + 1) + ".";
      const reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      racerArrivalTimer = window.setTimeout(startRacerLeg, reducedMotion ? 20 : 300);
      return;
    }

    if (racerStage === 5) {
      racer.src = RACER_FRAMES.victory;
      racer.classList.add("is-victory");
      raceStatus.textContent = "BOBO reached the finish line and is celebrating the completed transaction.";
      racerResetTimer = window.setTimeout(resetRacer, 10000);
    } else {
      racer.src = RACER_FRAMES.idle;
      raceStatus.textContent = "BOBO reached transaction step " + (racerStage + 1) + ".";
    }
  }

  function startRacerLeg() {
    stopRacerMotion();
    racer.classList.remove("is-victory");
    const direction = racerTargetStage > racerStage ? 1 : -1;
    racerStage += direction;
    raceTrack.dataset.racerStage = String(racerStage);
    raceStatus.textContent = "BOBO is driving to transaction step " + (racerStage + 1) + ".";
    racer.classList.add("is-driving");
    racer.src = RACER_FRAMES.driveA;
    racerFrame = false;
    racerFrameTimer = window.setInterval(function () {
      racerFrame = !racerFrame;
      racer.src = racerFrame ? RACER_FRAMES.driveA : RACER_FRAMES.driveB;
    }, 170);
    const reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    racerArrivalTimer = window.setTimeout(finishRacerLeg, reducedMotion ? 20 : 1170);
  }

  function moveRacer(stage) {
    const nextStage = Math.max(0, Math.min(5, Number(stage) || 0));
    if (nextStage < racerStage || nextStage < racerTargetStage) return;
    window.clearTimeout(racerResetTimer);
    racerResetTimer = 0;
    if (nextStage === racerTargetStage) {
      if (racerStage === 5 && !racerArrivalTimer && !racer.classList.contains("is-victory")) finishRacerLeg();
      return;
    }
    racerTargetStage = nextStage;
    if (racerArrivalTimer) return;
    startRacerLeg();
  }

  function setStatus(message, tone) {
    status.textContent = message;
    status.className = "swap-status" + (tone ? " " + tone : "");
    form.classList.toggle("is-error", tone === "error");
  }

  function setRouteStage(stage) {
    form.dataset.stage = String(stage);
    form.classList.toggle("wallet-connected", Boolean(walletAddress));
    form.classList.toggle("is-busy", busy);
    if (stage === 0) moveRacer(0);
    else if (stage === 1) moveRacer(1);

    if (stage === 0) {
      walletNodeState.textContent = walletAddress ? "Wallet connected" : "Authorization required";
      destinationState.textContent = "Awaiting amount";
    } else if (stage === 1) {
      destinationState.textContent = "Reading official pool";
    } else if (stage === 2) {
      destinationState.textContent = "Route ready for review";
    } else if (stage === 3) {
      walletNodeState.textContent = "Wallet connected";
      destinationState.textContent = "Ready to authorize";
    } else if (stage === 4) {
      destinationState.textContent = "Processing transaction";
    } else if (stage === 5) {
      destinationState.textContent = "Submitted to Solana";
    }
  }

  function syncRouteStage() {
    if (submitted) setRouteStage(5);
    else if (busy) setRouteStage(4);
    else if (activeQuote && walletAddress) setRouteStage(3);
    else if (activeQuote) setRouteStage(2);
    else if (inputAmount.value.trim()) setRouteStage(1);
    else setRouteStage(0);
  }

  function shorten(value, start, end) {
    return value.length > start + end ? value.slice(0, start) + "..." + value.slice(-end) : value;
  }

  function toBaseUnits(value, decimals) {
    const cleaned = String(value || "").trim().replace(/,/g, "");
    if (!/^(?:\d+\.?\d*|\.\d+)$/.test(cleaned)) throw new Error("Enter a valid amount.");
    const parts = cleaned.split(".");
    const whole = parts[0] || "0";
    const fraction = parts[1] || "";
    if (fraction.length > decimals) throw new Error("That amount has too many decimal places.");
    const units = (whole + fraction.padEnd(decimals, "0")).replace(/^0+(?=\d)/, "");
    if (!units || /^0+$/.test(units)) throw new Error("Enter an amount greater than zero.");
    return units;
  }

  function fromBaseUnits(value, decimals) {
    const digits = String(value || "0").padStart(decimals + 1, "0");
    const whole = digits.slice(0, -decimals);
    const fraction = digits.slice(-decimals).replace(/0+$/, "").slice(0, 8);
    return fraction ? whole + "." + fraction : whole;
  }

  function formatTokenNumber(value) {
    const number = Number(String(value).replace(/,/g, ""));
    if (!Number.isFinite(number)) return String(value);
    const maximumFractionDigits = number >= 1000 ? 2 : number >= 1 ? 6 : 8;
    return number.toLocaleString("en-US", { maximumFractionDigits: maximumFractionDigits });
  }

  function delay(milliseconds) {
    return new Promise(function (resolve) { window.setTimeout(resolve, milliseconds); });
  }

  async function fetchJsonWithTimeout(url, timeoutMs) {
    const controller = new AbortController();
    const timeout = window.setTimeout(function () { controller.abort(); }, timeoutMs);
    try {
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: controller.signal,
      });
      const data = await response.json().catch(function () { return {}; });
      return { response: response, data: data };
    } finally {
      window.clearTimeout(timeout);
    }
  }

  function clearWalletBalance() {
    balanceRequest += 1;
    walletBoboRaw = "0";
    boboWalletBalance.textContent = "--";
    walletHoldings.hidden = true;
  }

  function renderWalletBalance(raw, decimals) {
    walletBoboRaw = String(raw);
    const formatted = formatTokenNumber(fromBaseUnits(walletBoboRaw, Number(decimals) || TOKENS.BOBO.decimals));
    boboWalletBalance.textContent = formatted + " BOBO";
    boboWalletBalance.title = formatted + " BOBO in connected wallet";
    return formatted;
  }

  async function loadBoboBalanceDirect(address) {
    if (!window.solanaWeb3 || !window.solanaWeb3.Connection || !window.solanaWeb3.PublicKey) return null;
    const endpoints = ["https://solana-rpc.publicnode.com", "https://api.mainnet-beta.solana.com"];
    for (let index = 0; index < endpoints.length; index += 1) {
      let timeout = 0;
      try {
        const connection = new window.solanaWeb3.Connection(endpoints[index], "confirmed");
        const request = connection.getParsedTokenAccountsByOwner(
          new window.solanaWeb3.PublicKey(address),
          { mint: new window.solanaWeb3.PublicKey(BOBO_MINT) },
        );
        const deadline = new Promise(function (_, reject) {
          timeout = window.setTimeout(function () { reject(new Error("Balance request timed out.")); }, 7000);
        });
        const accounts = await Promise.race([request, deadline]);
        let raw = 0n;
        let decimals = TOKENS.BOBO.decimals;
        accounts.value.forEach(function (account) {
          const tokenAmount = account.account.data.parsed.info.tokenAmount;
          if (tokenAmount && /^\d+$/.test(String(tokenAmount.amount))) raw += BigInt(tokenAmount.amount);
          if (tokenAmount && Number.isInteger(tokenAmount.decimals)) decimals = tokenAmount.decimals;
        });
        return { raw: raw.toString(), decimals: decimals };
      } catch (error) {
        // Try the next public Solana endpoint.
      } finally {
        window.clearTimeout(timeout);
      }
    }
    return null;
  }

  async function loadBoboBalance(options) {
    if (!walletAddress) {
      clearWalletBalance();
      return null;
    }

    const address = walletAddress;
    const requestId = ++balanceRequest;
    const attempts = options && options.attempts ? options.attempts : 2;
    const previousRaw = options && typeof options.previousRaw === "string" ? options.previousRaw : null;
    walletHoldings.hidden = false;
    boboWalletBalance.textContent = "Loading...";

    for (let attempt = 0; attempt < attempts; attempt += 1) {
      try {
        const result = await fetchJsonWithTimeout(pumpApi("?action=balance&owner=" + encodeURIComponent(address)), 9000);
        const response = result.response;
        const data = result.data;
        if (requestId !== balanceRequest || address !== walletAddress) return null;
        if (!response.ok || !/^\d+$/.test(String(data.raw ?? ""))) throw new Error(data.error || "Balance unavailable");

        const raw = String(data.raw);
        const changed = previousRaw === null || raw !== previousRaw;
        if (options && options.expectChange && !changed && attempt < attempts - 1) {
          await delay(options.delay || 1200);
          continue;
        }

        return renderWalletBalance(raw, data.decimals);
      } catch (error) {
        if (attempt === attempts - 1) {
          const directBalance = await loadBoboBalanceDirect(address);
          if (requestId !== balanceRequest || address !== walletAddress) return null;
          if (directBalance) return renderWalletBalance(directBalance.raw, directBalance.decimals);
        }
        if (attempt < attempts - 1) {
          await delay(options && options.delay ? options.delay : 1200);
          continue;
        }
      }
    }

    if (requestId === balanceRequest) boboWalletBalance.textContent = "Unavailable";
    return null;
  }

  function setOutputAmount(value) {
    const displayValue = String(value);
    const digitCount = displayValue.replace(/[^0-9]/g, "").length;
    outputAmount.value = displayValue;
    outputAmount.classList.toggle("is-long", digitCount >= 7 && digitCount < 10);
    outputAmount.classList.toggle("is-very-long", digitCount >= 10);
    outputAmount.title = displayValue + " " + outputSymbol;
  }

  function animateOutput(value) {
    window.cancelAnimationFrame(outputAnimation);
    const target = Number(value);
    if (!Number.isFinite(target) || target <= 0 || target > 1000000000000) {
      setOutputAmount(formatTokenNumber(value));
      return;
    }

    const started = performance.now();
    const duration = 520;
    function frame(now) {
      const progress = Math.min(1, (now - started) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setOutputAmount(formatTokenNumber(target * eased));
      if (progress < 1) outputAnimation = window.requestAnimationFrame(frame);
      else setOutputAmount(formatTokenNumber(value));
    }
    outputAnimation = window.requestAnimationFrame(frame);
  }

  function renderToken(side, symbol) {
    side.textContent = TOKENS[symbol].symbol;
    const icon = side === inputToken ? inputTokenIcon : outputTokenIcon;
    icon.className = "token-mark " + symbol.toLowerCase();
    icon.textContent = symbol === "SOL" ? "S" : "B";
  }

  function clearQuote(options) {
    activeQuote = null;
    submitted = false;
    window.cancelAnimationFrame(outputAnimation);
    setOutputAmount("0.00");
    outputCaption.textContent = "Live output appears here.";
    minimumOutput.textContent = "Minimum received --";
    routeLabel.textContent = "Waiting";
    priceImpact.textContent = "--";
    if (!options || !options.preserveStage) syncRouteStage();
    updateAction();
  }

  function updateAction() {
    if (busy) return;
    const hasAmount = inputAmount.value.trim().length > 0;
    swapButton.disabled = !hasAmount || !activeQuote;
    if (!hasAmount) swapButton.textContent = "Enter an amount";
    else if (!activeQuote) swapButton.textContent = "Requesting live route";
    else if (!walletAddress) swapButton.textContent = "Connect wallet to continue";
    else swapButton.textContent = "Authorize " + inputSymbol + " to " + outputSymbol + " swap";
  }

  async function requestQuote() {
    const requestId = ++quoteRequest;
    clearQuote({ preserveStage: true });

    let amount;
    try {
      amount = toBaseUnits(inputAmount.value, TOKENS[inputSymbol].decimals);
    } catch (error) {
      inputCaption.textContent = error && error.message ? error.message : "Enter an amount.";
      setStatus("BOBO Swap is online. Enter an amount to request a live quote.");
      syncRouteStage();
      return;
    }

    setRouteStage(1);
    form.classList.add("is-busy");
    routeLabel.textContent = "Checking";
    inputCaption.textContent = "Reading the official BOBO/SOL pool...";
    destinationState.textContent = "Requesting live route";
    setStatus("BOBO Swap is requesting a live route from the official BOBO/SOL liquidity pool.");
    updateAction();

    const direction = inputSymbol === "SOL" ? "buy" : "sell";
    const params = new URLSearchParams({
      direction: direction,
      amount: amount,
      slippage: slippage.value,
    });

    try {
      const response = await fetch(pumpApi("?" + params.toString()), {
        headers: { Accept: "application/json" },
      });
      const data = await response.json().catch(function () { return {}; });
      if (requestId !== quoteRequest) return;
      if (!response.ok || !data.outputAmount) throw new Error(data.error || "No live PumpSwap quote is available.");

      activeQuote = {
        direction: direction,
        amount: amount,
        outputAmount: data.outputAmount,
        minimumOutput: data.minimumOutput || data.outputAmount,
      };
      const outputValue = fromBaseUnits(activeQuote.outputAmount, TOKENS[outputSymbol].decimals);
      const minimumValue = fromBaseUnits(activeQuote.minimumOutput, TOKENS[outputSymbol].decimals);
      animateOutput(outputValue);
      inputCaption.textContent = TOKENS[inputSymbol].name + " supplied by your wallet";
      outputCaption.textContent = "Estimated " + TOKENS[outputSymbol].name + " received";
      minimumOutput.textContent = "Minimum received " + formatTokenNumber(minimumValue) + " " + outputSymbol;
      routeLabel.textContent = "Direct pool";
      const impact = Number(data.priceImpactPct);
      priceImpact.textContent = Number.isFinite(impact) ? impact.toFixed(2) + "%" : "--";
      setStatus("Live BOBO/SOL route ready. Review every step, then authorize in your wallet.", "success");
      syncRouteStage();
      updateAction();
    } catch (error) {
      if (requestId !== quoteRequest) return;
      clearQuote({ preserveStage: true });
      routeLabel.textContent = "Unavailable";
      inputCaption.textContent = "Live pool route unavailable.";
      setStatus(error && error.message ? error.message : "The live BOBO/SOL pool is temporarily unavailable.", "error");
      setRouteStage(1);
    } finally {
      if (requestId === quoteRequest) form.classList.remove("is-busy");
    }
  }

  function scheduleQuote() {
    window.clearTimeout(quoteTimer);
    quoteRequest += 1;
    clearQuote({ preserveStage: true });
    syncRouteStage();
    quoteTimer = window.setTimeout(requestQuote, 420);
  }

  function getWalletProvider() {
    if (window.phantom && window.phantom.solana) return window.phantom.solana;
    if (window.solflare) return window.solflare;
    if (window.solana) return window.solana;
    return null;
  }

  async function connectWallet() {
    walletProvider = getWalletProvider();
    if (!walletProvider) {
      setStatus("Open this page in a compatible Solana wallet browser, or install Phantom or Solflare.", "error");
      return false;
    }
    try {
      const connection = await walletProvider.connect();
      const key = connection && connection.publicKey ? connection.publicKey : walletProvider.publicKey;
      walletAddress = key ? key.toString() : "";
      if (!walletAddress) throw new Error("Wallet connection was not completed.");
      walletState.textContent = shorten(walletAddress, 5, 4);
      walletNodeState.textContent = "Connected " + shorten(walletAddress, 4, 4);
      connectButton.textContent = "Connected";
      setStatus("Wallet connected. BOBO Swap never receives custody of your funds.", "success");
      syncRouteStage();
      updateAction();
      loadBoboBalance();
      return true;
    } catch (error) {
      setStatus(error && error.message ? error.message : "Wallet connection was cancelled.", "error");
      return false;
    }
  }

  function bytesToBase64(bytes) {
    let binary = "";
    for (let index = 0; index < bytes.length; index += 8192) {
      binary += String.fromCharCode.apply(null, bytes.subarray(index, index + 8192));
    }
    return window.btoa(binary);
  }

  async function submitSignedTransaction(signed) {
    const response = await fetch(pumpApi(), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        action: "submit",
        signedTransaction: bytesToBase64(signed.serialize()),
      }),
    });
    const data = await response.json().catch(function () { return {}; });
    if (!response.ok || !data.signature) throw new Error(data.error || "The signed transaction could not be submitted.");
    return data.signature;
  }

  async function waitForTransactionConfirmation(signature) {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const result = await fetchJsonWithTimeout(pumpApi("?action=status&signature=" + encodeURIComponent(signature)), 10000);
      const response = result.response;
      const data = result.data;
      if (!response.ok) throw new Error(data.error || "Solana confirmation could not be checked.");
      if (data.failed) throw new Error("Solana reported that the transaction failed.");
      if (data.confirmed) return true;
      await delay(1500);
    }
    return false;
  }

  async function executeSwap() {
    if (!walletAddress && !(await connectWallet())) return;
    if (!activeQuote) {
      await requestQuote();
      if (!activeQuote) return;
    }
    if (!window.solanaWeb3 || !window.solanaWeb3.VersionedTransaction) {
      setStatus("The transaction library did not load. Refresh the page and try again.", "error");
      return;
    }

    const pay = inputAmount.value.trim() + " " + inputSymbol;
    const receive = outputAmount.value + " " + outputSymbol;
    const boboAmount = outputSymbol === "BOBO" ? outputAmount.value : inputAmount.value.trim();
    const boboAmountLabel = outputSymbol === "BOBO" ? "BOBO received" : "BOBO sent";
    const previousBoboRaw = walletBoboRaw;
    const approved = await confirmSwapReview({ pay: pay, receive: receive, slippage: slippage.value });
    if (!approved) {
      setStatus("Transaction review closed. Nothing was submitted.");
      return;
    }

    busy = true;
    submitted = false;
    moveRacer(3);
    setRouteStage(4);
    swapButton.disabled = true;
    swapButton.textContent = "Preparing transaction...";
    setStatus("Preparing the official BOBO/SOL transaction for wallet authorization.");

    try {
      const response = await fetch(pumpApi(), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          action: "build",
          user: walletAddress,
          direction: activeQuote.direction,
          amount: activeQuote.amount,
          slippage: Number(slippage.value),
        }),
      });
      const data = await response.json().catch(function () { return {}; });
      if (!response.ok || !data.transaction) throw new Error(data.error || "The PumpSwap transaction could not be prepared.");

      const bytes = Uint8Array.from(window.atob(data.transaction), function (character) {
        return character.charCodeAt(0);
      });
      const transaction = window.solanaWeb3.VersionedTransaction.deserialize(bytes);
      swapButton.textContent = "Authorize in wallet...";
      destinationState.textContent = "Wallet approval requested";

      let signature;
      if (typeof walletProvider.signAndSendTransaction === "function") {
        const result = await walletProvider.signAndSendTransaction(transaction);
        signature = typeof result === "string" ? result : result && result.signature;
      } else if (typeof walletProvider.signTransaction === "function") {
        const signed = await walletProvider.signTransaction(transaction);
        signature = await submitSignedTransaction(signed);
      } else {
        throw new Error("This wallet cannot authorize Solana transactions from the browser.");
      }
      if (!signature) throw new Error("The wallet did not return a transaction signature.");

      swapButton.textContent = "Confirming on Solana...";
      destinationState.textContent = "Waiting for Solana confirmation";
      setStatus("Transaction submitted. BOBO Swap is waiting for Solana confirmation.");
      const confirmed = await waitForTransactionConfirmation(signature);
      if (!confirmed) {
        busy = false;
        activeQuote = null;
        form.classList.remove("is-busy");
        destinationState.textContent = "Confirmation pending";
        setStatus("Transaction submitted, but Solana confirmation is taking longer than expected. Check the transaction in your wallet.", "success");
        swapButton.textContent = "Confirmation pending";
        swapButton.disabled = true;
        return;
      }

      busy = false;
      submitted = true;
      inputAmount.value = "";
      activeQuote = null;
      setOutputAmount("0.00");
      minimumOutput.textContent = "Minimum received --";
      routeLabel.textContent = "Submitted";
      setRouteStage(5);
      moveRacer(5);
      setStatus("BOBO Swap confirmed on Solana: " + shorten(signature, 9, 9), "success");
      swapButton.textContent = "Transaction confirmed";
      swapButton.disabled = true;
      successAmountLabel.textContent = boboAmountLabel;
      successBoboAmount.textContent = formatTokenNumber(boboAmount) + " BOBO";
      successWalletBalance.textContent = "Updating...";
      successSolscan.href = "https://solscan.io/tx/" + encodeURIComponent(signature);
      showSuccessGraphic();

      const refreshedBalance = await loadBoboBalance({
        attempts: 6,
        delay: 1200,
        expectChange: true,
        previousRaw: previousBoboRaw,
      });
      successWalletBalance.textContent = refreshedBalance ? refreshedBalance + " BOBO" : boboWalletBalance.textContent;
    } catch (error) {
      const message = error && error.message ? error.message : "The transaction was not completed.";
      busy = false;
      submitted = false;
      setStatus(/reject|cancel/i.test(message) ? "Transaction cancelled in your wallet. Nothing was submitted." : message, "error");
      syncRouteStage();
      updateAction();
    }
  }

  connectButton.addEventListener("click", connectWallet);
  inputAmount.addEventListener("input", function () {
    if (submitted) {
      submitted = false;
      resetRacer();
    }
    scheduleQuote();
  });
  slippage.addEventListener("change", function () {
    slippageLabel.textContent = slippage.value + "%";
    scheduleQuote();
  });

  document.querySelectorAll("[data-amount]").forEach(function (button) {
    button.addEventListener("click", function () {
      inputAmount.value = button.dataset.amount || "";
      inputAmount.dispatchEvent(new Event("input", { bubbles: true }));
    });
  });

  document.getElementById("flipAssets").addEventListener("click", function () {
    submitted = false;
    resetRacer();
    const previous = inputSymbol;
    inputSymbol = outputSymbol;
    outputSymbol = previous;
    renderToken(inputToken, inputSymbol);
    renderToken(outputToken, outputSymbol);
    routeDirection.textContent = "Route 01 / " + inputSymbol + " to " + outputSymbol;
    inputAmount.value = "";
    clearQuote();
    inputCaption.textContent = "Enter an amount to request a live quote.";
    setStatus("Direction changed to " + inputSymbol + " for " + outputSymbol + ".");
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    executeSwap();
  });

  reviewCancel.addEventListener("click", function () { closeSwapReview(false); });
  reviewConfirm.addEventListener("click", function () { closeSwapReview(true); });
  reviewOverlay.addEventListener("click", function (event) {
    if (event.target === reviewOverlay) closeSwapReview(false);
  });

  successClose.addEventListener("click", function () {
    hideSuccessGraphic();
    swapButton.focus();
  });

  successOverlay.addEventListener("click", function (event) {
    if (event.target === successOverlay) hideSuccessGraphic();
  });

  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;
    if (!reviewOverlay.hidden) closeSwapReview(false);
    else if (!successOverlay.hidden) hideSuccessGraphic();
  });

  if (getWalletProvider() && getWalletProvider().isConnected && getWalletProvider().publicKey) {
    walletProvider = getWalletProvider();
    walletAddress = walletProvider.publicKey.toString();
    walletState.textContent = shorten(walletAddress, 5, 4);
    walletNodeState.textContent = "Connected " + shorten(walletAddress, 4, 4);
    connectButton.textContent = "Connected";
    loadBoboBalance();
  }

  if (walletProvider && typeof walletProvider.on === "function") {
    walletProvider.on("accountChanged", function (key) {
      walletAddress = key ? key.toString() : "";
      walletState.textContent = walletAddress ? shorten(walletAddress, 5, 4) : "Wallet not connected";
      walletNodeState.textContent = walletAddress ? "Connected " + shorten(walletAddress, 4, 4) : "Authorization required";
      connectButton.textContent = walletAddress ? "Connected" : "Connect wallet";
      if (walletAddress) loadBoboBalance();
      else clearWalletBalance();
      syncRouteStage();
      updateAction();
    });
  }

  function formatMoney(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "--";
    if (number >= 1000000) return "$" + (number / 1000000).toFixed(2) + "M";
    if (number >= 1000) return "$" + (number / 1000).toFixed(1) + "K";
    return "$" + number.toLocaleString("en-US", { maximumFractionDigits: 2 });
  }

  fetch("https://api.dexscreener.com/latest/dex/pairs/solana/" + PAIR)
    .then(function (response) {
      if (!response.ok) throw new Error("market unavailable");
      return response.json();
    })
    .then(function (data) {
      const pair = data && data.pairs && data.pairs[0];
      if (!pair) return;
      const price = Number(pair.priceUsd);
      document.getElementById("marketPrice").textContent = Number.isFinite(price) ? "$" + price.toPrecision(4) : "--";
      const change = Number(pair.priceChange && pair.priceChange.h24);
      const changeElement = document.getElementById("marketChange");
      changeElement.textContent = Number.isFinite(change) ? (change > 0 ? "+" : "") + change.toFixed(2) + "%" : "--";
      if (Number.isFinite(change)) changeElement.style.color = change >= 0 ? "var(--green)" : "#ff8b98";
      document.getElementById("marketLiquidity").textContent = formatMoney(pair.liquidity && pair.liquidity.usd);
      document.getElementById("marketVolume").textContent = formatMoney(pair.volume && pair.volume.h24);
      document.getElementById("marketFdv").textContent = formatMoney(pair.fdv);
      const buys = Number(pair.txns && pair.txns.h24 && pair.txns.h24.buys) || 0;
      const sells = Number(pair.txns && pair.txns.h24 && pair.txns.h24.sells) || 0;
      document.getElementById("marketTxns").textContent = (buys + sells).toLocaleString("en-US") + " trades";
    })
    .catch(function () {});

  document.getElementById("copyContract").addEventListener("click", function (event) {
    const button = event.currentTarget;
    navigator.clipboard.writeText(BOBO_MINT).then(function () {
      button.textContent = "Copied";
      window.setTimeout(function () { button.textContent = "Copy address"; }, 1600);
    }).catch(function () {
      button.textContent = "Select address";
    });
  });

  const now = new Date();
  document.getElementById("accessDate").textContent = "Accessed: " + now.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  if (/^https?:$/.test(window.location.protocol)) {
    document.getElementById("specimenUrl").textContent = "Service page: " + window.location.href.split("#")[0];
  }

  renderToken(inputToken, inputSymbol);
  renderToken(outputToken, outputSymbol);
  slippageLabel.textContent = slippage.value + "%";
  syncRouteStage();
  updateAction();
})();
