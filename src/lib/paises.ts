import type { SegmentoId } from "./types";

/** Países onde dá para buscar empresas, com idioma, moeda e fuso de cada um. */
export type PaisId = "BR" | "US" | "CA" | "GB" | "PT" | "ES" | "AU";
export type Lingua = "pt" | "pt-PT" | "en" | "es";

export interface Pais {
  id: PaisId;
  nome: string;
  bandeira: string;
  lingua: Lingua;
  locale: string; // formatação de números e moeda
  idiomaNome: string; // como aparece no painel
  nomeBusca: string; // nome do país usado na busca do Maps
  ddi: string;
  moeda: string;
  fuso: string; // para dizer bom dia / good morning no horário de lá
  regiao: string; // rótulo do campo de estado/região
  tld: string; // domínio sugerido
  apifyIdioma: string;
  /** Faixa de preço de um site institucional, na moeda local. */
  site: [number, number];
}

export const PAISES: Record<PaisId, Pais> = {
  BR: { id: "BR", nome: "Brasil", bandeira: "🇧🇷", lingua: "pt", locale: "pt-BR", idiomaNome: "Português", nomeBusca: "Brasil", ddi: "55", moeda: "BRL", fuso: "America/Sao_Paulo", regiao: "Estado", tld: ".com.br", apifyIdioma: "pt-BR", site: [700, 1800] },
  US: { id: "US", nome: "Estados Unidos", bandeira: "🇺🇸", lingua: "en", locale: "en-US", idiomaNome: "Inglês", nomeBusca: "United States", ddi: "1", moeda: "USD", fuso: "America/New_York", regiao: "Estado (ex.: Florida)", tld: ".com", apifyIdioma: "en", site: [500, 1500] },
  CA: { id: "CA", nome: "Canadá", bandeira: "🇨🇦", lingua: "en", locale: "en-CA", idiomaNome: "Inglês", nomeBusca: "Canada", ddi: "1", moeda: "CAD", fuso: "America/Toronto", regiao: "Província (ex.: Ontario)", tld: ".ca", apifyIdioma: "en", site: [600, 1800] },
  GB: { id: "GB", nome: "Reino Unido", bandeira: "🇬🇧", lingua: "en", locale: "en-GB", idiomaNome: "Inglês", nomeBusca: "United Kingdom", ddi: "44", moeda: "GBP", fuso: "Europe/London", regiao: "Região (ex.: Greater London)", tld: ".co.uk", apifyIdioma: "en", site: [400, 1200] },
  PT: { id: "PT", nome: "Portugal", bandeira: "🇵🇹", lingua: "pt-PT", locale: "pt-PT", idiomaNome: "Português de Portugal", nomeBusca: "Portugal", ddi: "351", moeda: "EUR", fuso: "Europe/Lisbon", regiao: "Distrito (ex.: Lisboa)", tld: ".pt", apifyIdioma: "pt-PT", site: [350, 1000] },
  ES: { id: "ES", nome: "Espanha", bandeira: "🇪🇸", lingua: "es", locale: "es-ES", idiomaNome: "Espanhol", nomeBusca: "España", ddi: "34", moeda: "EUR", fuso: "Europe/Madrid", regiao: "Província (ex.: Madrid)", tld: ".es", apifyIdioma: "es", site: [350, 1000] },
  AU: { id: "AU", nome: "Austrália", bandeira: "🇦🇺", lingua: "en", locale: "en-AU", idiomaNome: "Inglês", nomeBusca: "Australia", ddi: "61", moeda: "AUD", fuso: "Australia/Sydney", regiao: "Estado (ex.: NSW)", tld: ".com.au", apifyIdioma: "en", site: [700, 2000] },
};

export const LISTA_PAISES: Pais[] = ["BR", "US", "CA", "GB", "PT", "ES", "AU"].map((id) => PAISES[id as PaisId]);

export const paisDoLead = (l: { pais?: PaisId | null }): Pais => PAISES[l.pais ?? "BR"] ?? PAISES.BR;

export function dinheiro(v: number, p: Pais) {
  return v.toLocaleString(p.locale, { style: "currency", currency: p.moeda, maximumFractionDigits: 0 });
}

/** Hora local do país (0–23), para a saudação certa. */
export function horaNoPais(p: Pais, agora = new Date()) {
  const h = new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone: p.fuso }).format(agora);
  return Number(h) % 24;
}

/**
 * Converte um valor em reais para a moeda e o nível de preço do país, na mesma proporção
 * da faixa de um site institucional (ex.: R$ 700–1.800 no Brasil ≈ US$ 500–1.500 nos EUA).
 */
export function precoNoPais(valorBRL: number, p: Pais) {
  if (p.id === "BR") return valorBRL;
  const [minBR, maxBR] = PAISES.BR.site;
  const r = (p.site[0] + p.site[1]) / (minBR + maxBR);
  return Math.max(50, Math.round((valorBRL * r) / 50) * 50);
}

interface SegTrad {
  termo: string; // o que se digita no Google Maps
  plural: string;
  mostrar: string;
}

/** Nichos em inglês e espanhol: termo de busca do Maps e frases usadas nas mensagens. */
export const SEG_EN: Record<SegmentoId, SegTrad> = {
  odontologia: { termo: "dentist", plural: "dental clinics", mostrar: "your treatments, your team, the clinic and your location" },
  "clinica-medica": { termo: "medical clinic", plural: "medical clinics", mostrar: "your specialties, your doctors, opening hours and location" },
  petshop: { termo: "pet grooming", plural: "pet shops", mostrar: "grooming, vet care, products, photos of the pets you look after and your location" },
  oficina: { termo: "auto repair shop", plural: "auto repair shops", mostrar: "your services, the brands you work on, photos of the workshop and your location" },
  "estetica-automotiva": { termo: "car detailing", plural: "car detailing studios", mostrar: "your services with real photos, how you work and a quote request" },
  advocacia: { termo: "law firm", plural: "law firms", mostrar: "your practice areas, your lawyers and how to get in touch" },
  restaurante: { termo: "restaurant", plural: "restaurants", mostrar: "your menu with photos, opening hours, delivery, bookings and location" },
  salao: { termo: "hair salon", plural: "beauty salons", mostrar: "your services, your team, photos of your work, booking and location" },
  academia: { termo: "gym", plural: "gyms", mostrar: "your classes, timetable, facilities, trainers and a free trial" },
  transportadora: { termo: "freight company", plural: "freight companies", mostrar: "the areas you cover, your fleet, the loads you carry and an online quote" },
  imobiliaria: { termo: "real estate agency", plural: "real estate agencies", mostrar: "your listings with filters, a page for each property and how owners can list with you" },
  "loja-local": { termo: "store", plural: "local stores", mostrar: "your products, payment options, delivery or pickup and your location" },
  barbearia: { termo: "barber shop", plural: "barber shops", mostrar: "your services and prices, your barbers, photos of the cuts, booking and location" },
  "clinica-estetica": { termo: "aesthetic clinic", plural: "aesthetic clinics", mostrar: "your treatments, the practitioner, the clinic and your location" },
  psicologia: { termo: "psychologist", plural: "psychologists", mostrar: "your approach, your background, how the first session works and online sessions" },
  nutricionista: { termo: "nutritionist", plural: "nutritionists", mostrar: "your specialties, how the consultation works, online sessions and booking" },
  fisioterapia: { termo: "physiotherapy clinic", plural: "physiotherapy clinics", mostrar: "your specialties, your team, the clinic and booking" },
  contabilidade: { termo: "accountant", plural: "accounting firms", mostrar: "your services by type of business, your team and an online quote" },
  construcao: { termo: "construction company", plural: "builders and renovation companies", mostrar: "your past projects, services, how you work and the areas you cover" },
  buffet: { termo: "event venue", plural: "event venues and caterers", mostrar: "photos of the venue, packages, menu, capacity and a quote request" },
  "energia-solar": { termo: "solar panel installer", plural: "solar installers", mostrar: "how it works, installations you've done, warranty and a quote" },
  pousada: { termo: "guest house", plural: "guest houses and hotels", mostrar: "your rooms, photos, breakfast, location and a booking request" },
  otica: { termo: "optician", plural: "opticians", mostrar: "your frames, brands, lens types, eye tests and location" },
  "material-construcao": { termo: "building supply store", plural: "building supply stores", mostrar: "your products and brands, delivery area, quotes over WhatsApp and location" },
  vidracaria: { termo: "glass company", plural: "glass and glazing companies", mostrar: "shower screens, mirrors, windows, photos of your work and a quote request" },
  autopecas: { termo: "auto parts store", plural: "auto parts stores", mostrar: "parts, accessories, brands, search by car model and location" },
  "loja-carros": { termo: "car dealer", plural: "car dealerships", mostrar: "your stock with photos, details for each car, financing, trade-ins and location" },
  insulfilm: { termo: "window tinting", plural: "window tinting shops", mostrar: "film types, photos of finished cars, warranty and a quote by car model" },
  "moveis-planejados": { termo: "custom furniture", plural: "custom furniture makers", mostrar: "projects by room, materials, how the design process works and a quote request" },
  marmoraria: { termo: "stone countertops", plural: "stone and countertop companies", mostrar: "stone types, countertops, sinks, stairs, photos of your work and a quote" },
  "assistencia-celular": { termo: "phone repair", plural: "phone repair shops", mostrar: "your services, brands, warranty, turnaround time and a quote by model" },
  pilates: { termo: "pilates studio", plural: "pilates studios", mostrar: "your classes, timetable, plans, a trial class and location" },
  tatuagem: { termo: "tattoo studio", plural: "tattoo studios", mostrar: "your portfolio by style, your artists, aftercare, quotes and location" },
  autoescola: { termo: "driving school", plural: "driving schools", mostrar: "your courses, prices, the steps to get a licence and location" },
  dedetizadora: { termo: "pest control", plural: "pest control companies", mostrar: "your services, pests you treat, warranty, areas covered and a quote" },
  veterinaria: { termo: "veterinary clinic", plural: "vet clinics", mostrar: "your services, vaccines, emergency care, your team and booking" },
  chaveiro: { termo: "locksmith", plural: "locksmiths", mostrar: "your services, 24-hour call-outs, the areas you cover, car keys and locks" },
  "ar-condicionado": { termo: "air conditioning installation", plural: "air conditioning companies", mostrar: "installation, cleaning, maintenance, brands and a quote" },
  lavanderia: { termo: "laundry service", plural: "laundry services", mostrar: "your services, prices, turnaround, pickup and delivery and location" },
  "oficina-motos": { termo: "motorcycle repair", plural: "motorcycle repair shops", mostrar: "servicing, repairs, parts, brands, turnaround and location" },
};

export const SEG_ES: Record<SegmentoId, SegTrad> = {
  odontologia: { termo: "clínica dental", plural: "clínicas dentales", mostrar: "los tratamientos, el equipo, la clínica y la ubicación" },
  "clinica-medica": { termo: "clínica médica", plural: "clínicas médicas", mostrar: "las especialidades, los médicos, los horarios y la ubicación" },
  petshop: { termo: "peluquería canina", plural: "tiendas de mascotas", mostrar: "peluquería, veterinario, productos, fotos de las mascotas y la ubicación" },
  oficina: { termo: "taller mecánico", plural: "talleres mecánicos", mostrar: "los servicios, las marcas con las que trabajáis, fotos del taller y la ubicación" },
  "estetica-automotiva": { termo: "detailing coches", plural: "centros de detailing", mostrar: "los servicios con fotos reales, cómo trabajáis y la petición de presupuesto" },
  advocacia: { termo: "abogados", plural: "despachos de abogados", mostrar: "las áreas de práctica, los abogados y el contacto" },
  restaurante: { termo: "restaurante", plural: "restaurantes", mostrar: "la carta con fotos, los horarios, el delivery, las reservas y la ubicación" },
  salao: { termo: "peluquería", plural: "peluquerías y salones de belleza", mostrar: "los servicios, el equipo, fotos de los trabajos, las citas y la ubicación" },
  academia: { termo: "gimnasio", plural: "gimnasios", mostrar: "las actividades, los horarios, las instalaciones, el equipo y una clase de prueba" },
  transportadora: { termo: "empresa de transporte", plural: "empresas de transporte", mostrar: "las zonas que cubrís, la flota, los tipos de carga y un presupuesto online" },
  imobiliaria: { termo: "inmobiliaria", plural: "inmobiliarias", mostrar: "los inmuebles con filtros, una página para cada uno y cómo captar propietarios" },
  "loja-local": { termo: "tienda", plural: "tiendas", mostrar: "los productos, las formas de pago, envío o recogida y la ubicación" },
  barbearia: { termo: "barbería", plural: "barberías", mostrar: "los servicios y precios, los barberos, fotos de los cortes, las citas y la ubicación" },
  "clinica-estetica": { termo: "centro de estética", plural: "centros de estética", mostrar: "los tratamientos, la profesional, el centro y la ubicación" },
  psicologia: { termo: "psicólogo", plural: "psicólogos", mostrar: "el enfoque, la formación, cómo es la primera sesión y la terapia online" },
  nutricionista: { termo: "nutricionista", plural: "nutricionistas", mostrar: "las especialidades, cómo es la consulta, la consulta online y las citas" },
  fisioterapia: { termo: "fisioterapia", plural: "clínicas de fisioterapia", mostrar: "las especialidades, el equipo, la clínica y las citas" },
  contabilidade: { termo: "gestoría", plural: "gestorías y asesorías", mostrar: "los servicios por tipo de empresa, el equipo y un presupuesto online" },
  construcao: { termo: "empresa de reformas", plural: "empresas de construcción y reformas", mostrar: "las obras realizadas, los servicios, cómo trabajáis y las zonas que cubrís" },
  buffet: { termo: "salón de eventos", plural: "salones de eventos y caterings", mostrar: "fotos del espacio, los paquetes, el menú, la capacidad y la petición de presupuesto" },
  "energia-solar": { termo: "placas solares", plural: "instaladores de placas solares", mostrar: "cómo funciona, las instalaciones hechas, la garantía y un presupuesto" },
  pousada: { termo: "hostal", plural: "hostales y hoteles", mostrar: "las habitaciones, fotos, el desayuno, la ubicación y la petición de reserva" },
  otica: { termo: "óptica", plural: "ópticas", mostrar: "las monturas, las marcas, los tipos de lente, la revisión de la vista y la ubicación" },
  "material-construcao": { termo: "almacén de materiales de construcción", plural: "almacenes de materiales de construcción", mostrar: "los productos y marcas, la zona de entrega, presupuestos por WhatsApp y la ubicación" },
  vidracaria: { termo: "cristalería", plural: "cristalerías", mostrar: "mamparas, espejos, ventanas, fotos de trabajos y la petición de presupuesto" },
  autopecas: { termo: "recambios coche", plural: "tiendas de recambios", mostrar: "recambios, accesorios, marcas, búsqueda por modelo de coche y la ubicación" },
  "loja-carros": { termo: "concesionario coches", plural: "concesionarios y compraventas", mostrar: "el stock con fotos, la ficha de cada coche, la financiación, la tasación y la ubicación" },
  insulfilm: { termo: "tintado de lunas", plural: "talleres de tintado de lunas", mostrar: "los tipos de lámina, fotos de coches hechos, la garantía y un presupuesto por modelo" },
  "moveis-planejados": { termo: "muebles a medida", plural: "empresas de muebles a medida", mostrar: "proyectos por estancia, materiales, cómo funciona el proyecto y la petición de presupuesto" },
  marmoraria: { termo: "marmolería", plural: "marmolerías", mostrar: "los tipos de piedra, encimeras, lavabos, escaleras, fotos de trabajos y presupuesto" },
  "assistencia-celular": { termo: "reparación de móviles", plural: "tiendas de reparación de móviles", mostrar: "los servicios, las marcas, la garantía, el plazo y un presupuesto por modelo" },
  pilates: { termo: "estudio de pilates", plural: "estudios de pilates", mostrar: "las clases, los horarios, los planes, una clase de prueba y la ubicación" },
  tatuagem: { termo: "estudio de tatuajes", plural: "estudios de tatuajes", mostrar: "el portfolio por estilo, los tatuadores, los cuidados, presupuestos y la ubicación" },
  autoescola: { termo: "autoescuela", plural: "autoescuelas", mostrar: "los permisos, los precios, los pasos para sacarse el carnet y la ubicación" },
  dedetizadora: { termo: "control de plagas", plural: "empresas de control de plagas", mostrar: "los servicios, las plagas que tratáis, la garantía, las zonas y un presupuesto" },
  veterinaria: { termo: "clínica veterinaria", plural: "clínicas veterinarias", mostrar: "los servicios, las vacunas, urgencias, el equipo y las citas" },
  chaveiro: { termo: "cerrajero", plural: "cerrajeros", mostrar: "los servicios, la atención 24 horas, las zonas que cubrís, llaves de coche y cerraduras" },
  "ar-condicionado": { termo: "instalación de aire acondicionado", plural: "empresas de aire acondicionado", mostrar: "instalación, limpieza, mantenimiento, marcas y presupuesto" },
  lavanderia: { termo: "lavandería", plural: "lavanderías", mostrar: "los servicios, los precios, los plazos, la recogida y entrega y la ubicación" },
  "oficina-motos": { termo: "taller de motos", plural: "talleres de motos", mostrar: "revisiones, mecánica, recambios, marcas, plazos y la ubicación" },
};

/** Português de Portugal: mesmas frases do Brasil, sem siglas de conselhos brasileiros e com o vocabulário de lá. */
export function ajustarPT(texto: string) {
  return texto
    .replace(/ (com|e) (CRO|CRM|OAB|CRP|CRN|CREFITO|CRC)\b/g, "")
    .replace(/passo a passo da CNH/g, "passos para tirar a carta de condução")
    .replace(/\bcelular\b/g, "telemóvel")
    .replace(/\bcelulares\b/g, "telemóveis")
    .replace(/\bônibus\b/g, "autocarro")
    .replace(/\bacademias\b/g, "ginásios")
    .replace(/\bacademia\b/g, "ginásio")
    .replace(/\bloja de carros\b/g, "stand de automóveis")
    .replace(/\blojas de carros\b/g, "stands de automóveis")
    .replace(/\binsulfilm\b/gi, "películas para vidros")
    .replace(/\bbanho e tosa\b/g, "banhos e tosquias")
    .replace(/\bpet shops?\b/g, (m) => (m.endsWith("s") ? "lojas de animais" : "loja de animais"))
    .replace(/\bdedetizadoras?\b/g, (m) => (m.endsWith("s") ? "empresas de controlo de pragas" : "empresa de controlo de pragas"))
    .replace(/\bautoescolas?\b/g, (m) => (m.endsWith("s") ? "escolas de condução" : "escola de condução"))
    .replace(/\bescritórios de contabilidade\b/g, "gabinetes de contabilidade")
    .replace(/\bconvênios\b/g, "acordos e seguros");
}

/** Termo de busca no Google Maps para o nicho, no idioma do país. */
export function termoDeBusca(seg: SegmentoId, termoBR: string, p: Pais) {
  if (p.lingua === "en") return SEG_EN[seg]?.termo ?? termoBR;
  if (p.lingua === "es") return SEG_ES[seg]?.termo ?? termoBR;
  if (p.lingua === "pt-PT") return ajustarPT(termoBR);
  return termoBR;
}
