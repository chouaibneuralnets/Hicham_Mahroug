(function () {
  'use strict';

  const STORAGE_CLIENT = 'facture_client';
  const STORAGE_LAST_NUMERO = 'facture_last_numero';
  const FIXED_LOGO_PATHS = [
    'assets/logo-continental.png',
    'assets/logo-sailun.png',
    'assets/logo-michelin.png',
    'assets/logo-pirelli.png',
    'assets/logo-lassa.png'
  ];

  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = reject;
      img.src = src;
    });
  }

  async function drawFixedLogos(doc) {
    var maxW = 56;
    var maxH = 24;
    var topY = 4;
    var row2Y = 30;
    // 3 logos en haut, 2 logos en bas
    var slots = [
      { x: 10, y: topY },
      { x: 77, y: topY },
      { x: 144, y: topY },
      { x: 43.5, y: row2Y },
      { x: 110.5, y: row2Y }
    ];

    for (var i = 0; i < FIXED_LOGO_PATHS.length; i++) {
      var src = FIXED_LOGO_PATHS[i];
      var slot = slots[i];
      if (!slot) continue;
      try {
        var img = await loadImage(src);
        var boxW = maxW;
        var boxH = maxH;
        // SAILUN est tres horizontal: on lui donne une zone plus grande
        // pour avoir le meme impact visuel que les autres logos.
        if (i === 1) {
          boxW = 66;
          boxH = 30;
        }
        var ratio = img.width > 0 ? (img.height / img.width) : 0.35;
        var drawW = boxW;
        var drawH = drawW * ratio;
        if (drawH > boxH) {
          drawH = boxH;
          drawW = drawH / ratio;
        }
        var centeredX = slot.x + (boxW - drawW) / 2;
        var centeredY = slot.y + (boxH - drawH) / 2;
        doc.addImage(img, 'PNG', centeredX, centeredY, drawW, drawH, undefined, 'FAST');
      } catch (e) {}
    }
  }

  // --- Onglets ---
  document.querySelectorAll('.tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      var target = this.getAttribute('data-tab');
      document.querySelectorAll('.tab').forEach(function (t) { t.classList.remove('active'); });
      document.querySelectorAll('.panel').forEach(function (p) { p.classList.remove('active'); });
      this.classList.add('active');
      var panel = document.getElementById(target);
      if (panel) panel.classList.add('active');
    });
  });

  // --- Client : charger / sauvegarder ---
  function loadClient() {
    try {
      var data = localStorage.getItem(STORAGE_CLIENT);
      if (!data) return;
      var o = JSON.parse(data);
      var form = document.getElementById('form-client');
      if (!form) return;
      ['nomClient', 'iceClient', 'adresseClient'].forEach(function (key) {
        var input = form.elements[key];
        if (input && o[key] !== undefined) input.value = o[key];
      });
    } catch (e) {}
  }

  var formClient = document.getElementById('form-client');
  if (formClient) {
    formClient.addEventListener('submit', function (e) {
      e.preventDefault();
      var form = e.target;
      var o = {
        nomClient: (form.elements.nomClient.value || '').trim(),
        iceClient: (form.elements.iceClient.value || '').trim(),
        adresseClient: (form.elements.adresseClient.value || '').trim()
      };
      localStorage.setItem(STORAGE_CLIENT, JSON.stringify(o));
      alert('Client enregistre.');
    });
  }

  // --- Lignes de facture ---
  var ligneIndex = 0;

  function addLigne(designation, prixUnitaire, quantite) {
    var container = document.getElementById('lignes-container');
    var div = document.createElement('div');
    div.className = 'ligne-item';
    div.dataset.index = ligneIndex++;
    div.innerHTML =
      '<button type="button" class="remove-ligne" aria-label="Supprimer">×</button>' +
      '<input type="text" name="designation" placeholder="Désignation" value="' + (designation || '') + '">' +
      '<input type="number" name="prixUnitaire" placeholder="Prix unitaire" step="0.01" min="0" value="' + (prixUnitaire || '') + '">' +
      '<input type="number" name="quantite" placeholder="Quantité" min="0" step="1" value="' + (quantite || '') + '">';
    container.appendChild(div);
    div.querySelector('.remove-ligne').addEventListener('click', function () {
      div.remove();
      updateTotaux();
    });
    ['designation', 'prixUnitaire', 'quantite'].forEach(function (name) {
      var input = div.querySelector('[name="' + name + '"]');
      if (input) input.addEventListener('input', updateTotaux);
    });
    return div;
  }

  var addLigneBtn = document.getElementById('add-ligne');
  if (addLigneBtn) {
    addLigneBtn.addEventListener('click', function () {
      addLigne();
      updateTotaux();
    });
  }

  function getLignes() {
    var items = [];
    document.querySelectorAll('#lignes-container .ligne-item').forEach(function (div) {
      var des = (div.querySelector('[name="designation"]') || {}).value || '';
      var pu = parseFloat((div.querySelector('[name="prixUnitaire"]') || {}).value) || 0;
      var qte = parseFloat((div.querySelector('[name="quantite"]') || {}).value) || 0;
      if (des || pu || qte) items.push({ designation: des, prixUnitaire: pu, quantite: qte, totalTTC: pu * qte });
    });
    return items;
  }

  function updateTotaux() {
    var lignes = getLignes();
    var totalTTC = lignes.reduce(function (s, l) { return s + l.totalTTC; }, 0);
    var tvaPct = parseFloat(document.getElementById('tvaPct').value) || 20;
    var totalHT = Math.round(totalTTC / (1 + tvaPct / 100) * 100) / 100;
    var tva = Math.round((totalTTC - totalHT) * 100) / 100;
    var el = document.getElementById('resume-totaux');
    if (el) {
      el.innerHTML = 'Total HT : <strong>' + formatMoney(totalHT) + ' DHS</strong><br>' +
        'TVA ' + tvaPct + '% : <strong>' + formatMoney(tva) + ' DHS</strong><br>' +
        'Total TTC : <strong>' + formatMoney(totalTTC) + ' DHS</strong>';
    }
  }

  var tvaInput = document.getElementById('tvaPct');
  if (tvaInput) tvaInput.addEventListener('input', updateTotaux);

  function formatMoney(n) {
    var fixed = n.toFixed(2);
    var parts = fixed.split('.');
    var intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return intPart + ',' + parts[1];
  }

  // --- Montant en lettres (français) ---
  var unites = ['', 'UN', 'DEUX', 'TROIS', 'QUATRE', 'CINQ', 'SIX', 'SEPT', 'HUIT', 'NEUF'];
  var dizaines = ['', 'DIX', 'VINGT', 'TRENTE', 'QUARANTE', 'CINQUANTE', 'SOIXANTE', 'SOIXANTE', 'QUATRE-VINGT', 'QUATRE-VINGT'];
  var dix = ['DIX', 'ONZE', 'DOUZE', 'TREIZE', 'QUATORZE', 'QUINZE', 'SEIZE', 'DIX-SEPT', 'DIX-HUIT', 'DIX-NEUF'];

  function centaines(n) {
    if (n === 0) return '';
    if (n === 1) return 'CENT ';
    return unites[n] + ' CENT ';
  }

  function dizainesUnites(n) {
    if (n < 10) return unites[n];
    if (n < 20) return dix[n - 10];
    var d = Math.floor(n / 10);
    var u = n % 10;
    if (d === 7) return 'SOIXANTE-' + dizainesUnites(n - 60);
    if (d === 9) return 'QUATRE-VINGT-' + dizainesUnites(n - 80);
    if (u === 0) return dizaines[d];
    if (d === 1) return 'DIX-' + unites[u].toLowerCase();
    return dizaines[d] + '-' + unites[u].toLowerCase();
  }

  function numberToWords(n) {
    n = Math.floor(n);
    if (n === 0) return 'ZÉRO';
    var parts = [];
    var millions = Math.floor(n / 1000000);
    if (millions > 0) {
      if (millions === 1) parts.push('UN MILLION');
      else parts.push(numberToWords(millions) + ' MILLIONS');
      n %= 1000000;
    }
    var milliers = Math.floor(n / 1000);
    if (milliers > 0) {
      if (milliers === 1) parts.push('MILLE');
      else parts.push(numberToWords(milliers) + ' MILLE');
      n %= 1000;
    }
    if (n >= 100) {
      parts.push(centaines(Math.floor(n / 100)).trim());
      n %= 100;
    }
    if (n > 0) parts.push(dizainesUnites(n));
    return parts.join(' ').replace(/\s+/g, ' ').trim();
  }

  function montantEnLettres(totalTTC) {
    var s = numberToWords(Math.round(totalTTC));
    return 'Arrêter la présente facture à la somme de : ' + s + ' DIRHAMS TTC.';
  }

  // --- Numéro de facture auto ---
  function suggestNumero() {
    var last = localStorage.getItem(STORAGE_LAST_NUMERO);
    var year = new Date().getFullYear();
    var num = 1;
    if (last) {
      var parts = last.split('/');
      if (parseInt(parts[1], 10) === year) num = parseInt(parts[0].replace(/\D/g, ''), 10) + 1;
    }
    var str = 'DEC' + String(num).padStart(4, '0') + '/' + year;
    var input = document.getElementById('numeroFacture');
    if (input && !input.value) input.value = str;
  }

  // --- Génération PDF (jsPDF) ---
  var formFacture = document.getElementById('form-facture');
  if (formFacture) formFacture.addEventListener('submit', async function (e) {
    e.preventDefault();
    var client = {};
    try {
      client = JSON.parse(localStorage.getItem(STORAGE_CLIENT) || '{}');
    } catch (err) {}

    // Prend les donnees client du formulaire meme si "Enregistrer client" n'a pas ete clique
    var liveClientForm = document.getElementById('form-client');
    if (liveClientForm) {
      client.nomClient = (liveClientForm.nomClient.value || '').trim();
      client.iceClient = (liveClientForm.iceClient.value || '').trim();
      client.adresseClient = (liveClientForm.adresseClient.value || '').trim();
      localStorage.setItem(STORAGE_CLIENT, JSON.stringify(client));
    }

    var numero = (document.getElementById('numeroFacture') || {}).value || '';
    var dateFacture = (document.getElementById('dateFacture') || {}).value || '';
    var lignes = getLignes();
    var tvaPct = parseFloat(document.getElementById('tvaPct').value) || 20;
    var totalTTC = lignes.reduce(function (s, l) { return s + l.totalTTC; }, 0);
    var totalHT = Math.round(totalTTC / (1 + tvaPct / 100) * 100) / 100;
    var tva = Math.round((totalTTC - totalHT) * 100) / 100;

    if (!client.nomClient) {
      alert('Renseignez le client dans l\'onglet Client.');
      return;
    }
    if (!numero || !dateFacture) {
      alert('Numéro et date de facture requis.');
      return;
    }
    if (lignes.length === 0) {
      alert('Ajoutez au moins une ligne.');
      return;
    }

    if (!window.jspdf || !window.jspdf.jsPDF) {
      alert('Generation PDF indisponible: rechargez la page avec internet.');
      return;
    }
    var doc = new window.jspdf.jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    var pageW = 210;
    var left = 12;
    var right = 198;
    var y = 16;
    var footerTop = 262;
    await drawFixedLogos(doc);
    y = 64;

    // 1) Titre société centré au milieu
    doc.setFontSize(24);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(220, 90, 0);
    var title1 = 'STE PNEUMATIQUE DAKHIL';
    var title1X = (pageW - doc.getTextWidth(title1)) / 2;
    doc.text(title1, title1X, y);
    y += 7;

    // 2) Forme juridique centrée
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    var title2 = 'SARLAU';
    var title2X = (pageW - doc.getTextWidth(title2)) / 2;
    doc.text(title2, title2X, y);
    doc.setTextColor(0, 0, 0);
    y += 4;

    // 3) Bloc a droite: Casablanca + FACTURE N° + date
    var dateStr = dateFacture ? new Date(dateFacture + 'T12:00:00').toLocaleDateString('fr-FR') : '';
    var rightBlockY = y + 1;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text('Casablanca Le, ' + dateStr, right, rightBlockY, { align: 'right' });
    doc.setFont(undefined, 'bold');
    doc.text('FACTURE N° : ' + numero, right, rightBlockY + 6, { align: 'right' });
    doc.setFont(undefined, 'normal');
    y = rightBlockY + 18;

    // 4) Client (encadre a gauche pour occuper la largeur)
    var clientBoxTop = y - 4;
    doc.setDrawColor(170, 170, 170);
    doc.setLineWidth(0.2);
    doc.rect(left, clientBoxTop, 118, 16);
    doc.setFont(undefined, 'bold');
    doc.text(client.nomClient || '', left + 2, y + 1);
    doc.setFont(undefined, 'normal');
    if (client.iceClient) {
      doc.text('ICE : ' + client.iceClient, left + 2, y + 7);
    }
    // fin bloc client + espace visuel avant le tableau DESIGNATION
    y += 38;

    // Repartition verticale plus compacte pour éviter les grands vides
    var mainContentTop = 108;
    if (y < mainContentTop) y = mainContentTop;

    // 6) Tableau : DESIGNATION | PRIX UNITAIRE | QUANTITE | TOTAL TTC (grille complète)
    doc.setFontSize(10);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    var colD = left;
    var colPU = left + 98;
    var colQte = left + 132;
    var colTot = left + 157;
    var colEnd = right;
    var rowH = 8;
    var tableTop = y;

    doc.setFont(undefined, 'bold');
    doc.rect(colD, tableTop - 6, colEnd - colD, 6);
    doc.text('DESIGNATION', colD + 3, tableTop - 1);
    doc.text('PRIX UNITAIRE', colPU + 3, tableTop - 1);
    doc.text('QUANTITE', colQte + 3, tableTop - 1);
    doc.text('TOTAL TTC', colTot + 3, tableTop - 1);
    y = tableTop + 2;
    doc.setFont(undefined, 'normal');

    // Lignes verticales (colonnes)
    doc.line(colPU, tableTop - 6, colPU, tableTop - 6 + 6);
    doc.line(colQte, tableTop - 6, colQte, tableTop - 6 + 6);
    doc.line(colTot, tableTop - 6, colTot, tableTop - 6 + 6);

    lignes.forEach(function (l) {
      doc.rect(colD, y - 2, colEnd - colD, rowH);
      doc.line(colPU, y - 2, colPU, y - 2 + rowH);
      doc.line(colQte, y - 2, colQte, y - 2 + rowH);
      doc.line(colTot, y - 2, colTot, y - 2 + rowH);
      doc.text(l.designation.substring(0, 40), colD + 3, y + 2);
      doc.text(formatMoney(l.prixUnitaire), colPU + 3, y + 2);
      doc.text(String(l.quantite), colQte + 3, y + 2);
      doc.text(formatMoney(l.totalTTC), colTot + 3, y + 2);
      y += rowH;
    });
    // Espace volontaire entre tableau DESIGNATION et tableau des totaux
    y += 24;

    // 8) Deuxième tableau des totaux sous le premier tableau (style identique à l'image)
    var totalsTop = y;
    var totalsRowH = 9;
    var totalsHeight = totalsRowH * 3;
    var totalsTableY = totalsTop - 2;
    var totalsSplitX = colD + (colEnd - colD) * 0.61;
    var totalsBlue = [17, 43, 99];

    // Fond gris clair + bordures fines grises
    doc.setDrawColor(95, 95, 95);
    doc.setLineWidth(0.25);
    doc.setFillColor(242, 242, 242);
    doc.rect(colD, totalsTableY, colEnd - colD, totalsHeight, 'FD');
    doc.line(colD, totalsTableY + totalsRowH, colEnd, totalsTableY + totalsRowH);
    doc.line(colD, totalsTableY + totalsRowH * 2, colEnd, totalsTableY + totalsRowH * 2);
    doc.line(totalsSplitX, totalsTableY, totalsSplitX, totalsTableY + totalsHeight);

    // Texte bleu foncé comme la capture
    doc.setTextColor(totalsBlue[0], totalsBlue[1], totalsBlue[2]);
    doc.setFontSize(10);

    // Ligne 1
    doc.setFont(undefined, 'bold');
    doc.text('Total HT', colD + 1.5, totalsTableY + 6);
    doc.text(formatMoney(totalHT) + 'DHS', colEnd - 1.5, totalsTableY + 6, { align: 'right' });

    // Ligne 2
    doc.setFont(undefined, 'normal');
    doc.text('TVA ' + tvaPct + '%', colD + 1.5, totalsTableY + 6 + totalsRowH);
    doc.text(formatMoney(tva) + 'DHS', colEnd - 1.5, totalsTableY + 6 + totalsRowH, { align: 'right' });

    // Ligne 3
    doc.setFont(undefined, 'bold');
    doc.text('Total TTC', colD + 1.5, totalsTableY + 6 + totalsRowH * 2);
    doc.text(formatMoney(totalTTC) + ' DHS', colEnd - 1.5, totalsTableY + 6 + totalsRowH * 2, { align: 'right' });

    // Retour couleur texte noir pour la suite
    doc.setTextColor(0, 0, 0);
    y = totalsTop + totalsHeight + 6;

    // 9) Arrêter la présente facture à la somme de : ...
    // Place la phrase juste après le tableau des totaux.
    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    var phrase = montantEnLettres(totalTTC);
    var split = doc.splitTextToSize(phrase, right - left);
    y += 2;
    split.forEach(function (line) {
      doc.text(line, left, y);
      y += 6;
    });

    // 10) Bloc fixe en bas: orange comme le titre + centre horizontalement
    // SIEGE S0CIAL : 181 DAKHLA INARA 1 AIN CHOCK CASABLANCA
    // RC : 597111 IF : 53882583 Patente: 34008002-ICE 00333238000080
    // Tél 06 640153549
    doc.setFontSize(10.5);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.line(left, footerTop, colEnd, footerTop);
    doc.setTextColor(220, 90, 0);

    var footerLine1 = 'SIEGE S0CIAL : 181 DAKHLA INARA 1 AIN CHOCK CASABLANCA';
    var footerLine2 = 'RC : 597111 IF : 53882583 Patente: 34008002-ICE 00333238000080';
    var footerLine3 = 'Tél 0640153549';

    // Centrage manuel pour compatibilité maximale jsPDF
    doc.setFontSize(10.5);
    doc.setFont(undefined, 'bold');
    var x1 = (pageW - doc.getTextWidth(footerLine1)) / 2;
    doc.text(footerLine1, x1, footerTop + 6);

    doc.setFontSize(9.2);
    doc.setFont(undefined, 'bold');
    var x2 = (pageW - doc.getTextWidth(footerLine2)) / 2;
    doc.text(footerLine2, x2, footerTop + 12);

    doc.setFontSize(9.5);
    doc.setFont(undefined, 'bold');
    var x3 = (pageW - doc.getTextWidth(footerLine3)) / 2;
    doc.text(footerLine3, x3, footerTop + 17);
    doc.setTextColor(0, 0, 0);

    var filename = 'FACTURE N°' + numero.replace(/\//g, '-') + '.pdf';
    doc.save(filename);

    localStorage.setItem(STORAGE_LAST_NUMERO, numero);
  });

  // --- Date du jour par défaut ---
  var dateInput = document.getElementById('dateFacture');
  if (dateInput) {
    var today = new Date().toISOString().slice(0, 10);
    if (!dateInput.value) dateInput.value = today;
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  }

  loadClient();
  if (document.getElementById('lignes-container')) addLigne();
  suggestNumero();
  updateTotaux();
})();
