const $ = (sel) => document.querySelector(sel);

const fSemana = $("#fSemana");
const fEntidad = $("#fEntidad");
const fContrato = $("#fContrato");
const semanaRango = $("#semanaRango");

const kValidacion = $("#kValidacion");
const kDeudor = $("#kDeudor");
const kCodeudor = $("#kCodeudor");
const kTotal = $("#kTotal");

const tValidacion = $("#tValidacion");
const tDeudor = $("#tDeudor");
const tCodeudor = $("#tCodeudor");
const tTotal = $("#tTotal");

const rowsInfo = $("#rowsInfo");
const tbody = $("#tabla tbody");

const btnReset = $("#btnReset");

const numberFmt = new Intl.NumberFormat("es-CO");

const METRIC_KEYS = new Set(["validacionIdentidad","analisisDeudor","analisisCodeudor","total"]);

let sortState = { key: "total", dir: "desc" }; // por defecto: mayor → menor

function uniqueSorted(arr){
  return [...new Set(arr)].sort((a,b)=> String(a).localeCompare(String(b), "es"));
}

function parseISO(iso){
  const [y,m,d] = iso.split("-").map(Number);
  return new Date(y, m-1, d, 12, 0, 0);
}

function fmtDate(iso){
  if(!iso) return "—";
  const d = parseISO(iso);
  return d.toLocaleDateString("es-CO", { year:"numeric", month:"2-digit", day:"2-digit" });
}

function buildSelect(selectEl, items, allLabel){
  selectEl.innerHTML = "";
  const optAll = document.createElement("option");
  optAll.value = "";
  optAll.textContent = allLabel;
  selectEl.appendChild(optAll);

  items.forEach(v=>{
    const opt = document.createElement("option");
    opt.value = v;
    opt.textContent = v;
    selectEl.appendChild(opt);
  });
}

function weekRangeLabel(weekValue){
  if(!weekValue){
    semanaRango.textContent = "Mostrando varias semanas";
    return;
  }
  const rows = DATA.filter(x=> x.semana === weekValue);
  if(!rows.length){
    semanaRango.textContent = "—";
    return;
  }

  const starts = rows.map(r=>r.fechaInicio).filter(Boolean).sort();
  const ends = rows.map(r=>r.fechaFin).filter(Boolean).sort();
  const minStart = starts.length ? starts[0] : "";
  const maxEnd = ends.length ? ends[ends.length-1] : "";

  const fallback = rows[0].fechaRango ? `(${rows[0].fechaRango})` : "";
  if(minStart && maxEnd){
    semanaRango.textContent = `Del ${fmtDate(minStart)} al ${fmtDate(maxEnd)} ${fallback}`.trim();
  }else if(rows[0].fechaRango){
    semanaRango.textContent = rows[0].fechaRango;
  }else{
    semanaRango.textContent = "—";
  }
}

function getFilters(){
  return {
    semana: fSemana.value,
    entidad: fEntidad.value,
    contrato: fContrato.value,
  };
}

function applyFilters(rows, filters){
  return rows.filter(r=>{
    if(filters.semana && r.semana !== filters.semana) return false;
    if(filters.entidad && r.entidad !== filters.entidad) return false;
    if(filters.contrato && r.contrato !== filters.contrato) return false;
    return true;
  });
}

function sortRows(rows){
  const { key, dir } = sortState;
  const factor = dir === "asc" ? 1 : -1;

  return [...rows].sort((a,b)=>{
    const av = a[key];
    const bv = b[key];

    if(METRIC_KEYS.has(key)){
      return (Number(av) - Number(bv)) * factor;
    }
    return String(av).localeCompare(String(bv), "es") * factor;
  });
}

function sum(rows, key){
  return rows.reduce((acc,r)=> acc + (Number(r[key]) || 0), 0);
}

function renderKpis(rows){
  const v = sum(rows, "validacionIdentidad");
  const d = sum(rows, "analisisDeudor");
  const c = sum(rows, "analisisCodeudor");
  const t = sum(rows, "total");

  kValidacion.textContent = numberFmt.format(v);
  kDeudor.textContent = numberFmt.format(d);
  kCodeudor.textContent = numberFmt.format(c);
  kTotal.textContent = numberFmt.format(t);

  tValidacion.textContent = numberFmt.format(v);
  tDeudor.textContent = numberFmt.format(d);
  tCodeudor.textContent = numberFmt.format(c);
  tTotal.textContent = numberFmt.format(t);

  rowsInfo.textContent = `${rows.length} filas`;
}

function renderTable(rows){
  tbody.innerHTML = "";

  rows.forEach(r=>{
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.semana}</td>
      <td>${escapeHtml(r.entidad)}</td>
      <td>${escapeHtml(r.contrato)}</td>
      <td class="num">${numberFmt.format(r.validacionIdentidad)}</td>
      <td class="num">${numberFmt.format(r.analisisDeudor)}</td>
      <td class="num">${numberFmt.format(r.analisisCodeudor)}</td>
      <td class="num"><strong>${numberFmt.format(r.total)}</strong></td>
      <td>${escapeHtml(r.encargado || "—")}</td>
    `;
    tbody.appendChild(tr);
  });
}

function escapeHtml(s){
  return String(s ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function update(){
  const filters = getFilters();
  weekRangeLabel(filters.semana);

  const filtered = applyFilters(DATA, filters);
  const sorted = sortRows(filtered);

  renderKpis(filtered);
  renderTable(sorted);
}

function syncSortIndicators(){
  document.querySelectorAll("#tabla thead th").forEach(th=>{
    const key = th.dataset.key;
    if(!key) return;
    const base = th.getAttribute("data-base") || th.textContent.replace(/[\s▲▼]+$/,"");
    th.setAttribute("data-base", base);
    th.textContent = base;

    if(key === sortState.key){
      th.textContent += sortState.dir === "asc" ? " ▲" : " ▼";
    }
  });
}

function init(){
  const semanas = uniqueSorted(DATA.map(x=>x.semana));
  const entidades = uniqueSorted(DATA.map(x=>x.entidad));
  const contratos = uniqueSorted(DATA.map(x=>x.contrato));

  buildSelect(fSemana, semanas, "Todas");
  buildSelect(fEntidad, entidades, "Todas");
  buildSelect(fContrato, contratos, "Todas");

  [fSemana, fEntidad, fContrato].forEach(el => el.addEventListener("change", update));

  btnReset.addEventListener("click", ()=>{
    fSemana.value = "";
    fEntidad.value = "";
    fContrato.value = "";
    sortState = { key: "total", dir: "desc" };
    syncSortIndicators();
    update();
  });

  document.querySelectorAll("#tabla thead th").forEach(th=>{
    th.addEventListener("click", ()=>{
      const key = th.dataset.key;
      if(!key) return;

      if(sortState.key !== key){
        sortState.key = key;
        sortState.dir = METRIC_KEYS.has(key) ? "desc" : "asc";
      }else{
        sortState.dir = sortState.dir === "asc" ? "desc" : "asc";
      }
      syncSortIndicators();
      update();
    });
  });

  syncSortIndicators();
  update();
}

init();
