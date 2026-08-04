const labels={P01:"国家自主贡献（NDC）",P02:"绿色发展战略",P03:"绿色发展行动计划或路线图",P04:"绿色经济政策",P05:"强制碳排放交易市场（ETS）",P06:"自愿碳市场",P07:"绿色金融战略",P08:"绿色金融分类目录",P09:"环境税或碳税",P10:"主权绿色债券",P11:"绿色信贷优惠政策",P12:"环境或气候压力测试",P13:"证券交易所ESG披露要求",P14:"金融机构环境信息披露",P15:"绿色债券发行框架或指引"};
const iso={32:"ARG",36:"AUS",40:"AUT",56:"BEL",76:"BRA",124:"CAN",152:"CHL",156:"CHN",158:"CHN",170:"COL",208:"DNK",231:"ETH",242:"FJI",250:"FRA",276:"DEU",288:"GHA",344:"CHN",356:"IND",360:"IDN",372:"IRL",380:"ITA",392:"JPN",398:"KAZ",404:"KEN",410:"KOR",446:"CHN",458:"MYS",480:"MUS",484:"MEX",504:"MAR",528:"NLD",566:"NGA",578:"NOR",608:"PHL",616:"POL",620:"PRT",643:"RUS",682:"SAU",686:"SEN",690:"SYC",702:"SGP",710:"ZAF",724:"ESP",752:"SWE",756:"CHE",764:"THA",784:"ARE",792:"TUR",818:"EGY",826:"GBR",840:"USA",860:"UZB",704:"VNM"};
const first20=["P01","P02","P03","P04","P05","P06","P07","P08","P09","P10","P11","P12","P13","P14","P15","P16","P17","P18","M01","M02"];
const numericIndicators=new Set(["M01","M02","I08","I09","I10","I11","I12","I13","I15"]);
const continentMeta={
  Africa:{name:"非洲",members:["EGY","ETH","GHA","KEN","MAR","MUS","NGA","SEN","SYC","ZAF"]},
  Americas:{name:"美洲",members:["ARG","BRA","CAN","CHL","COL","MEX","USA"]},
  Asia:{name:"亚洲",members:["ARE","CHN","IND","IDN","JPN","KAZ","KOR","MYS","PHL","SAU","SGP","THA","TUR","UZB","VNM"]},
  Europe:{name:"欧洲",members:["AUT","BEL","DNK","FRA","DEU","IRL","ITA","NLD","NOR","POL","PRT","RUS","ESP","SWE","CHE","GBR"]},
  Oceania:{name:"大洋洲",members:["AUS","FJI"]}
};
const mapPublic=["P01","P02","P03","P04","P05","P06","P07","P08","P09","P10"];
const mapRestricted=["P11","P12","P13","P14","P15"];
const rawValue=v=>v==null||v===""?"—":typeof v==="number"?new Intl.NumberFormat("zh-CN",{maximumFractionDigits:1}).format(v):String(v).replace(/^yes$/i,"有").replace(/^no$/i,"无");
const chineseName=country=>country.iso3==="CHN"?"中国（中国内地）":country.country;
const englishName=country=>country.iso3==="CHN"?"China (Chinese Mainland)":country.countryEnglish;
const moduleFor=code=>code.startsWith("P")?"政策与战略":code.startsWith("M")?"市场与产品":"国际合作";
const continentFor=country=>Object.keys(continentMeta).find(key=>continentMeta[key].members.includes(country.iso3))||"Other";
const continentName=country=>continentMeta[continentFor(country)]?.name||"其他";
const countryOrder=country=>{const members=continentMeta[continentFor(country)]?.members||[];return members.indexOf(country.iso3)<0?999:members.indexOf(country.iso3)};
function arc(n,t){let x=0,y=0;const a=t.arcs[n<0?~n:n].map(([dx,dy])=>{x+=dx;y+=dy;return[t.transform.translate[0]+x*t.transform.scale[0],t.transform.translate[1]+y*t.transform.scale[1]]});return n<0?a.reverse():a}
function ring(arcs,t){return arcs.flatMap((n,i)=>{const p=arc(n,t);return i?p.slice(1):p})}
function project([x,y]){return[(x+180)/360*1000,(90-y)/180*500]}
function geometryPath(g,t){const polygons=g.type==="Polygon"?[g.arcs]:g.arcs;return polygons.map(poly=>poly.map(arcs=>{const points=ring(arcs,t).map(project),segments=[];let segment=[];points.forEach((point,i)=>{if(i&&Math.abs(point[0]-points[i-1][0])>500){if(segment.length)segments.push(segment);segment=[point]}else segment.push(point)});if(segment.length)segments.push(segment);return segments.map(s=>"M"+s.map(([x,y],i)=>(i?"L":"")+x.toFixed(1)+","+y.toFixed(1)).join("")+"Z").join("")}).join("")).join("")}

Promise.all([
  fetch("public-2025.json").then(r=>r.json()),
  fetch("catalogue-years.json").then(r=>r.json()),
  fetch("map-years.json").then(r=>r.json()),
  fetch("countries-110m.json").then(r=>r.json())
]).then(([data,historical,map,topo])=>{
  const wdiSection=document.createElement("section");
  wdiSection.className="section wdi-section"; wdiSection.id="wdi";
  wdiSection.innerHTML='<div class="section-title"><div><p class="eyebrow">WORLD DEVELOPMENT INDICATORS</p><h2>世界银行世界发展指标（WDI）</h2><p>作为发展条件与宏观背景基准，为绿色金融指标提供国家发展背景。</p></div></div><div class="wdi-meta"><span>覆盖50个国家</span><span>1960—2025年</span><span>数据来源：<a href="https://data.worldbank.org/indicator" target="_blank" rel="noopener">World Bank WDI</a></span></div><p>在详细指标查询中点击国家名称，可进入国家WDI页面，按主题查看最新可用年度数据及长期趋势。</p>';
  document.querySelector("#about")?.before(wdiSection);
  let mapYear="2025",catalogueYear="2025",code="P01",query="";
  const select=document.querySelector("#indicator"),catalogueYearSelect=document.querySelector("#catalogue-year"),search=document.querySelector("#search"),rows=document.querySelector("#rows"),note=document.querySelector("#indicator-note"),svg=document.querySelector("#world-map"),tip=document.querySelector("#tooltip"),years=document.querySelector("#years");
  const showcase=new Map(data.showcase.map(x=>[x.iso3+":"+x.code,x]));
  const allYears=["2021","2022","2023","2024","2025"];
  const catalogueData=()=>catalogueYear==="2025"?{indicators:data.indicators,countries:data.countries}:historical.years[catalogueYear];
  function populateYears(){catalogueYearSelect.innerHTML=allYears.map(y=>`<option value="${y}" ${y===catalogueYear?"selected":""}>${y}年</option>`).join("")}
  function populateIndicators(){
    const items=[...catalogueData().indicators].sort((a,b)=>{
      const ai=first20.indexOf(a.code),bi=first20.indexOf(b.code);
      if(ai>=0||bi>=0)return(ai<0?999:ai)-(bi<0?999:bi);
      return data.indicators.findIndex(x=>x.code===a.code)-data.indicators.findIndex(x=>x.code===b.code);
    });
    if(!items.some(x=>x.code===code)) code=items[0]?.code||"";
    select.innerHTML=items.map(x=>`<option value="${x.code}" ${x.code===code?"selected":""}>${first20.includes(x.code)?"":"🔒 "}${x.code} · ${x.name}</option>`).join("");
  }
  function observation(country,indicator){
    if(catalogueYear!=="2025"||numericIndicators.has(indicator)) return null;
    return showcase.get(country.iso3+":"+indicator)?.binary??null;
  }
  function rawObservation(country,indicator){
    if(catalogueYear==="2025") return showcase.get(country.iso3+":"+indicator)?.rawValue??null;
    return country.values?.[indicator]??null;
  }
  function renderTable(){
    const view=catalogueData(),ind=view.indicators.find(x=>x.code===code),locked=!first20.includes(code),q=query.toLowerCase();
    note.innerHTML=ind?`<div><b>${ind.code} · ${ind.name}</b>${ind.definition?`<p>${ind.definition}</p>`:""}</div><strong>${numericIndicators.has(code)?"数值指标":"二元指标"}</strong>`:"";
    rows.innerHTML=view.countries.filter(x=>!q||chineseName(x).includes(query)||englishName(x).toLowerCase().includes(q)).sort((a,b)=>Object.keys(continentMeta).indexOf(continentFor(a))-Object.keys(continentMeta).indexOf(continentFor(b))||countryOrder(a)-countryOrder(b)).map(x=>{
      const result=observation(x,code);
      const shown=locked?'<span class="blur">•••</span>':result==null?'<span class="dash">—</span>':`<span class="pill ${result===1?"":"no"}">${result}</span>`;
      const raw=rawObservation(x,code);
      const rawShown=locked?'<span class="blur">•••</span>':`<span class="raw">${rawValue(raw)}</span>`;
      return`<tr><td><a class="country-link" href="country.html?iso=${x.iso3}">${chineseName(x)} <span class="country-link-icon" aria-label="查看国家WDI">↗</span></a><small>${englishName(x)}</small></td><td>${continentName(x)}</td><td>${moduleFor(code)}</td><td>${rawShown}</td><td>${shown}</td></tr>`;
    }).join("");
  }
  function jumpToCatalogue(){
    catalogueYear=mapYear;
    catalogueYearSelect.value=mapYear;
    populateIndicators();
    renderTable();
  }
  function countryCard(p){
    const records=data.indicators.map((indicator,i)=>{
      const raw=p.values[indicator.code]??(mapYear==="2025"?showcase.get(p.iso3+":"+indicator.code)?.rawValue:null);
      const restricted=i>=10;
      return`<div class="${restricted?"restricted":""}"><dt>${indicator.name}</dt><dd>${restricted?'<span class="blur">•••</span>':rawValue(raw)}</dd></div>`;
    }).join("");
    tip.classList.remove("is-empty");
    tip.innerHTML=`<p>${mapYear}年 · ${chineseName(p)}<span>${englishName(p)}</span></p><dl>${records}</dl><a class="map-more" href="#catalogue">更多指标 <b>→</b></a>`;
    tip.querySelector(".map-more").addEventListener("click",jumpToCatalogue);
  }
  function renderMap(){
    const records=new Map((map.years[mapYear]||[]).map(x=>[x.iso3,x]));
    const setActiveCountry=(country,active)=>svg.querySelectorAll(`[data-country="${country}"]`).forEach(shape=>shape.classList.toggle("active",active));
    svg.innerHTML="";
    tip.innerHTML="";
    tip.classList.add("is-empty");
    topo.objects.countries.geometries.forEach(g=>{
      const id=iso[Number(g.id)],p=records.get(id);
      const d=document.createElementNS("http://www.w3.org/2000/svg","path");
      d.setAttribute("d",geometryPath(g,topo));
      d.setAttribute("class",p?"shape lit":"shape");
      if(id)d.setAttribute("data-country",id);
      d.setAttribute("tabindex",p?"0":"-1");
      if(p){
        ["mouseenter","focus","click"].forEach(event=>d.addEventListener(event,()=>{setActiveCountry(id,true);countryCard(p)}));
        ["mouseleave","blur"].forEach(event=>d.addEventListener(event,()=>setActiveCountry(id,false)));
      }
      svg.appendChild(d);
    });
  }
  Object.keys(map.years).sort().forEach(y=>{
    const button=document.createElement("button");
    button.textContent=y;
    button.className=y===mapYear?"active":"";
    button.onclick=()=>{mapYear=y;[...years.children].forEach(x=>x.classList.toggle("active",x.textContent===y));renderMap()};
    years.appendChild(button);
  });
  catalogueYearSelect.onchange=e=>{catalogueYear=e.target.value;populateIndicators();renderTable()};
  select.onchange=e=>{code=e.target.value;renderTable()};
  search.oninput=e=>{query=e.target.value;renderTable()};
  populateYears();populateIndicators();renderTable();renderMap();
});
