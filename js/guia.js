// Contenido de la guía práctica. Revisado con fuentes el 26/11/2026.
// Solo entra lo que tiene fuente comprobada; lo que no se pudo confirmar se ha dejado fuera.
export const REVISED = '26 de noviembre de 2026';

const CCJM = ['CCJM, revisión clínica', 'https://www.ccjm.org/content/85/10/801'];
const JAMA = ['JAMA Neurology', 'https://jamanetwork.com/journals/jamaneurology/article-abstract/2749401'];
const AAN = ['Guía AAN 2022', 'https://pubmed.ncbi.nlm.nih.gov/34965987/'];
const NEUPSIG = ['Guía NeuPSIG', 'https://pubmed.ncbi.nlm.nih.gov/25575710/'];
const NICE = ['Guía NICE', 'https://www.nice.org.uk/guidance/cg173/chapter/Recommendations'];
const CLEVE = ['Cleveland Clinic', 'https://my.clevelandclinic.org/health/diseases/17479-small-fiber-neuropathy'];
const CSUR = ['Ministerio de Sanidad, centros de referencia', 'https://www.sanidad.gob.es/areas/csur/centros/docs/2._Centros_designados_CSUR_noviembre26.pdf'];

export const CAUSES = [
  { id: 'diabetes', name: 'Diabetes o prediabetes', text: 'Es la causa más frecuente, cerca de un tercio de los casos. La prediabetes puede pasar desapercibida.', test: 'glucosa en ayunas, hemoglobina glicada y curva de glucosa', treat: true, src: [CCJM] },
  { id: 'b12', name: 'Falta de vitamina B12', text: 'Se corrige con suplementos. La metformina y los protectores de estómago pueden bajarla.', test: 'vitamina B12 y ácido metilmalónico', treat: true, src: [CCJM] },
  { id: 'tiroides', name: 'Tiroides', text: 'Una tiroides que funciona mal puede afectar a los nervios.', test: 'análisis de tiroides', treat: true, src: [CCJM] },
  { id: 'sjogren', name: 'Síndrome de Sjögren y otras autoinmunes', text: 'Sjögren explica cerca de uno de cada diez casos. Suele dar ojos y boca secos.', test: 'anticuerpos anti-Ro, anti-La y antinucleares', treat: true, src: [CCJM] },
  { id: 'gamma', name: 'Proteínas anormales en sangre y amiloidosis', text: 'Algunas proteínas anormales y la amiloidosis, también la hereditaria, dañan las fibras finas.', test: 'electroforesis de proteínas, inmunofijación y, si hace falta, estudio genético', treat: true, src: [CCJM, JAMA] },
  { id: 'fabry', name: 'Enfermedad de Fabry', text: 'Es genética y rara. Se busca si hay otros síntomas o familiares afectados.', test: 'estudio enzimático o genético', treat: true, src: [JAMA] },
  { id: 'virus', name: 'VIH y hepatitis C', text: 'Se miran si hay algún factor de riesgo.', test: 'análisis de sangre', treat: true, src: [CCJM] },
  { id: 'sarcoidosis', name: 'Sarcoidosis', text: 'Es frecuente en quien ya tiene sarcoidosis. El neurólogo decide si hace falta estudiarla.', test: 'según el caso', treat: true, src: [CCJM] },
  { id: 'b6', name: 'Exceso de vitamina B6', text: 'Tomar demasiados suplementos con B6 puede dañar los nervios. Revisa las etiquetas de lo que tomas.', test: 'vitamina B6 en sangre y repaso de suplementos', treat: true, src: [['Advances in Nutrition 2021', 'https://pubmed.ncbi.nlm.nih.gov/33912895/']] },
];

export const TESTS = [
  { name: 'Biopsia de piel', text: 'Se saca un trocito de piel de la pierna de 3 milímetros y se cuentan las fibras finas. Es la prueba de referencia según la guía europea. Se compara con lo normal para tu edad y sexo.', src: [['Guía europea EFNS/PNS', 'https://air.unimi.it/bitstream/2434/530580/2/EFNS-PNS%20skin%20biopsy_EurJNeurol_2010.pdf'], ['Cleveland Clinic', 'https://my.clevelandclinic.org/health/diagnostics/17479-skin-biopsy-for-small-fiber-sensory-neuropathy']] },
  { name: 'Por qué el electromiograma puede salir normal', text: 'El electromiograma mide las fibras gruesas. Las finas no se ven en esa prueba, así que un resultado normal no descarta la fibra pequeña.', src: [['Brain Sciences 2025', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11853085']] },
  { name: 'Prueba de sensibilidad a la temperatura', text: 'Un aparato mide a qué temperatura empiezas a notar calor o frío. Ayuda, pero sola no basta.', src: [['Brain Sciences 2025', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11853085']] },
  { name: 'Pruebas del sudor', text: 'Miden si los nervios que activan el sudor funcionan. Solo las hacen algunos hospitales.', src: [['Guía europea EFNS', 'https://neurology.med.wayne.edu/neuromuscular/efns_guidelinea_for_skin_biopsy_in_diagnosis_of_peripheral_neuropathy_-_eur_j_neurol_2005.pdf']] },
  { name: 'Fotografía de los nervios del ojo', text: 'Una cámara especial fotografía los nervios de la córnea. Es rápida y no duele, pero todavía no sirve sola para el diagnóstico.', src: [['Revisión científica', 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8954271/']] },
];

// Estados: ok aprobado y de uso habitual · mid se usa con pruebas limitadas · trial en ensayo · no no recomendado
export const TREATMENTS = [
  { name: 'Tratar la causa', st: 'ok', text: 'Si hay una causa, como azúcar alto, falta de B12 o tiroides, tratarla es lo primero.', src: [CLEVE, CCJM] },
  { name: 'Gabapentina y pregabalina', st: 'ok', text: 'Primera opción para el dolor en las guías. Pueden dar sueño o mareo; la FDA avisa de riesgo respiratorio si se combinan con otros sedantes.', src: [AAN, ['Aviso de la FDA', 'https://www.fda.gov/drugs/drug-safety-and-availability/la-fda-advierte-acerca-de-problemas-respiratorios-graves-con-los-medicamentos-para-convulsiones-y']] },
  { name: 'Duloxetina', st: 'ok', text: 'Un antidepresivo que también calma el dolor de los nervios. Es primera opción en las guías.', src: [AAN, NICE] },
  { name: 'Amitriptilina y nortriptilina', st: 'ok', text: 'Antidepresivos antiguos que, en dosis bajas, se usan para el dolor de los nervios.', src: [NICE, NEUPSIG] },
  { name: 'Parche de capsaicina al 8 %', st: 'ok', text: 'Se pone en la consulta sobre la zona que duele y se puede repetir cada tres meses. Aprobado en Europa para el dolor de los nervios.', src: [['Agencia Europea del Medicamento', 'https://www.ema.europa.eu/en/medicines/human/EPAR/qutenza']] },
  { name: 'Parches de lidocaína', st: 'mid', text: 'Anestesian la piel de la zona. Se toleran bien, pero la prueba de que funcionan es débil.', src: [NEUPSIG] },
  { name: 'Tramadol', st: 'mid', text: 'Las guías lo dejan como segunda opción o para momentos puntuales.', src: [NEUPSIG, NICE] },
  { name: 'Opioides fuertes', st: 'no', text: 'La guía americana aconseja no usarlos para este dolor por sus riesgos.', src: [AAN] },
  { name: 'Inmunoglobulina por vena', st: 'mid', text: 'Se valora solo cuando la causa parece autoinmune. El único ensayo con placebo en fibra pequeña sin causa no mostró mejora clara del dolor.', src: [['Ensayo NCT02637700', 'https://clinicaltrials.gov/study/NCT02637700']] },
  { name: 'Estimulación de la médula', st: 'mid', text: 'Un aparato implantado. En un ensayo grande de neuropatía diabética funcionó en 8 de cada 10. No hay ensayos propios de fibra pequeña.', src: [['JAMA Neurology 2021', 'https://pubmed.ncbi.nlm.nih.gov/33818600/']] },
  { name: 'Ejercicio, psicología y sueño', st: 'mid', text: 'El ejercicio suave ayuda en otras neuropatías, y tratar el sueño y el ánimo mejora cómo se vive el dolor.', src: [['Sports Medicine 2021', 'https://link.springer.com/content/pdf/10.1007/s40279-021-01596-6.pdf'], AAN] },
  { name: 'Suzetrigina', st: 'trial', text: 'Un fármaco nuevo que bloquea una vía del dolor. En Estados Unidos está aprobado solo para el dolor agudo. Para la neuropatía diabética hay dos ensayos grandes; los resultados se esperan a mediados de 2027. No está aprobado en Europa.', src: [['Vertex, noviembre 2026', 'https://investors.vrtx.com/news-releases/news-release-details/vertex-reports-third-quarter-2026-financial-results'], ['FDA', 'https://www.fda.gov/news-events/press-announcements/fda-approves-novel-non-opioid-treatment-moderate-severe-acute-pain']] },
  { name: 'ST-503, terapia génica', st: 'trial', text: 'Busca apagar un interruptor del dolor de las fibras finas. Ensayo de seguridad en personas con fibra pequeña y dolor que no mejora con nada.', src: [['Ensayo NCT06980948', 'https://clinicaltrials.gov/study/NCT06980948']] },
];
export const ST = { ok: 'Aprobado y de uso habitual', mid: 'Se usa, con pruebas limitadas', trial: 'En ensayo', no: 'No recomendado' };

export const TIPS = [
  { name: 'Cuidado con el agua caliente', text: 'Si notas menos la temperatura, el agua muy caliente puede quemarte sin avisar. Pruébala con el codo o con un termómetro.', src: [] },
  { name: 'Mira tus pies cada día', text: 'Con menos sensibilidad, una herida pequeña puede pasar desapercibida. Usa un espejo y calzado cómodo, cerrado y sin costuras.', src: [] },
  { name: 'Muévete cada día, sin pasarte', text: 'Caminar, bici o natación de forma regular ayuda en otras neuropatías.', src: [['Sports Medicine 2021', 'https://link.springer.com/content/pdf/10.1007/s40279-021-01596-6.pdf']] },
  { name: 'Si te mareas al levantarte', text: 'Levántate en dos tiempos, primero sentado. Cruzar las piernas al ponerte de pie ayuda. Cuéntaselo a tu médico.', src: [['Revisión científica', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5524853']] },
  { name: 'El sueño también se trata', text: 'Si el dolor no te deja dormir, dilo en la consulta: tiene tratamiento y mejora el dolor del día.', src: [AAN] },
  { name: 'El ánimo cuenta', text: 'La ansiedad y el bajón son frecuentes con dolor de larga duración y se pueden tratar.', src: [AAN] },
  { name: 'Ojo con los suplementos', text: 'No tomes vitamina B6 en exceso sin consultarlo: en dosis altas daña los nervios.', src: [['Advances in Nutrition 2021', 'https://pubmed.ncbi.nlm.nih.gov/33912895/']] },
  { name: 'Cuándo consultar pronto', text: 'Si los síntomas se extienden a otras zonas, pide cita antes. Si pierdes fuerza rápido o te desmayas, ve a urgencias o llama al 112.', src: [CLEVE] },
];

export const PLACES = [
  { name: 'Hospital de la Santa Creu i Sant Pau, Barcelona', text: 'Centro de referencia nacional en enfermedades neuromusculares de adultos. Su equipo ha publicado casos de fibra pequeña diagnosticados con biopsia de piel. Pregunta antes si hacen el recuento de fibras.', src: [['Unidad neuromuscular', 'https://www.santpau.cat/en/ufmnm'], CSUR] },
  { name: 'Hospital Vall d’Hebron, Barcelona', text: 'Centro de referencia nacional en enfermedades neuromusculares, de niños y adultos.', src: [CSUR] },
  { name: 'Hospital de Bellvitge, L’Hospitalet', text: 'Centro de referencia nacional en enfermedades neuromusculares de adultos.', src: [CSUR] },
  { name: 'Fuera de Cataluña', text: 'También son centros de referencia La Fe en Valencia, Virgen del Rocío en Sevilla y Donostia. Para ir a uno de otra comunidad, te deriva tu médico a través de tu comunidad.', src: [CSUR, ['Cómo se deriva', 'https://www.sanidad.gob.es/areas/csur/centros/procedimientoDerivacion.htm']] },
  { name: 'Unidades del dolor', text: 'Se llega derivado por tu médico de cabecera o tu neurólogo. Muchas personas con dolor crónico nunca son derivadas: pídelo tú.', src: [['Sociedad Española del Dolor', 'https://www.sedolor.es/pacientes/']] },
  { name: 'Hospital del Mar, Barcelona', text: 'Tiene unidad del dolor y unidad de neuromodulación para dolor de los nervios que no mejora con fármacos.', src: [['Unidad de neuromodulación', 'https://hospitaldelmar.cat/en/unitat-neuromodulacio-dolor']] },
  { name: 'Foundation for Peripheral Neuropathy', text: 'Fundación de Estados Unidos con información sobre fibra pequeña y grupos de apoyo. En inglés.', src: [['Web', 'https://www.foundationforpn.org/causes/small-fiber-neuropathy/']] },
  { name: 'Federación ASEM', text: 'Federación española de enfermedades neuromusculares, con sede en Barcelona. Pregúntales si atienden fibra pequeña.', src: [['Ficha', 'https://sid-inico.usal.es/centros_servicios/federacion-asem-federacion-espanola-de-enfermedades-neuromusculares/']] },
];

export const PAPERS = [
  { name: 'Grado de discapacidad en Cataluña', text: 'Lo gestiona la Generalitat. Se pide por internet con idCAT Mòbil o certificado digital, o en persona. Luego te citan para valorarte. Con un 33 % o más tienes tarjeta válida en toda España.', src: [['Trámite en Gencat', 'https://tramits.gencat.cat/es/tramits/tramits-temes/Reconeixement-o-revisio-del-grau-de-la-discapacitat']] },
  { name: 'Grado de discapacidad en otras comunidades', text: 'Lo gestiona cada comunidad autónoma.', src: [['IMSERSO', 'https://imserso.es/en/autonomia-personal-dependencia/grado-de-discapacidad']] },
  { name: 'Baja e incapacidad', text: 'La baja temporal dura hasta un año, ampliable seis meses. La incapacidad permanente se pide en la sede de la Seguridad Social.', src: [['Seguridad Social', 'https://sede.seg-social.gob.es/wps/portal/sede/sede/Ciudadanos/Incapacidad']] },
  { name: 'Buscar ensayos en España', text: 'El registro público de ensayos de la agencia española del medicamento.', src: [['Registro REEC', 'https://reec.aemps.es/reec/estudio/buscar']] },
];

export const QUESTIONS = [
  '¿Qué prueba confirma en mi caso que es fibra pequeña?',
  '¿Qué análisis me han hecho para buscar la causa y cuáles faltan?',
  '¿Me han hecho una curva de glucosa, aunque la hemoglobina glicada salga normal?',
  '¿Hay que descartar Sjögren, amiloidosis o Fabry en mi caso?',
  '¿Algún medicamento o suplemento que tomo puede estar influyendo?',
  '¿Con qué tratamiento para el dolor empezamos y cuándo sabremos si funciona?',
  '¿El parche de capsaicina o los de lidocaína serían una opción para mí?',
  '¿Podría ser autoinmune? ¿Tendría sentido la inmunoglobulina?',
  '¿Qué ejercicio, apoyo psicológico y medidas para dormir me recomienda?',
  '¿Qué síntomas me deben hacer volver antes y puedo entrar en algún ensayo?',
];
