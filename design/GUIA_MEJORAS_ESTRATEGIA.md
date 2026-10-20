# TERRA COMPUTE — Guía de mejoras para convertirlo en un gran juego de estrategia

Versión 1 · 2026-10-20 · base: `main` a04ce38 (v3 + WAR ROOM multijugador)

Cómo leer esta guía: cada punto dice **qué** hacer, **por qué** (qué juego lo hace bien y qué problema resuelve), **dónde** tocar el código actual, **cómo comprobar** que está bien hecho y su **prioridad** (P1 imprescindible · P2 muy importante · P3 pulido) y **esfuerzo** (S < 1 día · M 1–3 días · L > 3 días). Las fases del final ordenan el trabajo.

---

## 0. Diagnóstico del estado actual

**Lo que ya funciona bien**
- Economía con cadenas reales (acero, chips, energía, empleo, vivienda) y mercado mundial.
- Mapa isométrico vistoso con adyacencias, obras, humo, tráfico y efectos.
- Historia jugable: unos 30 eventos históricos, 13 dilemas dinámicos y elecciones.
- Final tenso: proyectos ASI rivales, DEFCON, hitos mundiales, rango S–D.
- Multijugador P2P sin servidor para hasta 8 jugadores.

**Lo que impide que sea de primera división**
1. **Los rivales no juegan.** Siguen una curva histórica con retraso (`historicalCapability(year - lag)` en `src/game/engine.ts`). No gestionan economía ni toman decisiones reales. Sin un adversario con agencia no hay estrategia profunda.
2. **Hay un solo camino a la victoria**, la superinteligencia segura. Todas las partidas convergen en el mismo plan.
3. **El árbol tecnológico es casi lineal** y está atado al calendario histórico (±10 años). No hay elecciones que cierren puertas.
4. **El mapa no es un tablero de conflicto.** Solo hay un continente propio, sin territorio disputado ni logística entre bloques.
5. **El medio juego es plano.** El bot de pruebas se estanca entre 10^13 y 10^14 de 1980 a 2005, y otra vez en 10^21,7 al final.
6. **Falta feedback explicativo.** El jugador ve números, pero no siempre el porqué ni qué hacer después.
7. **Todo el juego está en inglés.** El traductor actual es automático.
8. **Nadie ha jugado partidas completas con personas.** El equilibrio está medido solo con un bot.

---

## 1. Núcleo estratégico (P1)

### 1.1 Rivales con IA real que juegan con tus mismas reglas
- **Qué:** cada bloque rival tiene su propia economía simplificada:
  - presupuesto, energía, chips, investigación y edificios agregados (no hace falta un mapa de casillas);
  - las mismas tecnologías, decretos y operaciones que tú;
  - toma decisiones cada año con un planificador sencillo: utilidad ponderada por personalidad.
- **Por qué:** es lo que separa *Civilization* y *Europa Universalis* de un juego de gestión. El jugador debe sentir que compite contra alguien que se adapta y que aprovecha sus errores.
- **Dónde:**
  - nuevo `src/game/ai/` con `nation.ts` (estado agregado), `planner.ts` (decisiones) y `personality.ts`;
  - `tickRivals()` deja de usar `historicalCapability` y pasa a simular;
  - la curva histórica queda solo como «guía» que empuja suavemente, para no romper la ambientación.
- **Personalidades (ya esbozadas en `RIVAL_LEADERS`):**

  | Líder | Prioridades |
  |---|---|
  | Volkov (URSS) | cómputo a toda costa, poco alineamiento, mucho espionaje |
  | Hale (Norteamérica) | gasto masivo y regulación tardía |
  | Varga (Europa) | tratados y seguridad |
  | Lin (China) | construcción rapidísima e industria |
  | Rao (India) | talento e investigación |
  | Okafor (África) | salto tecnológico y solar |
  | Duarte (Sudamérica) | comercio y materias primas |
  | Calder (Oceanía) | defensa y discreción |

- **Comprobar:**
  - en las simulaciones, los rivales llegan a la superinteligencia entre 2026 y 2040 según cómo juegues;
  - sabotear o firmar tratados con ellos cambia su trayectoria de forma medible;
  - dos partidas con la misma facción y semillas distintas producen órdenes de llegada distintos.
- **Esfuerzo:** L.

### 1.2 IA con memoria y diplomacia propia
- **Qué:**
  - cada rival recuerda agravios y favores (registro con caducidad);
  - los rivales se alían y se traicionan **entre ellos**;
  - te hacen propuestas con contenido: «te damos 100 chips por una moratoria de 5 años»;
  - lanzan ultimátums.
- **Por qué:** la diplomacia de *Civilization VI* y *Stellaris* funciona cuando la IA tiene motivos visibles («nos sabotearon en 1987»).
- **Dónde:** `ai/memory.ts`. Las propuestas se generan como eventos en `dynamic-events.ts`. En el panel de diplomacia se muestran los motivos de cada relación (desglose del número).
- **Comprobar:** pasa el ratón por la relación con un rival y ves por qué es −35. Los bloques rivales firman pactos entre sí y eso aparece en el registro mundial.
- **Esfuerzo:** M.

### 1.3 Varias condiciones de victoria
- **Qué:**
  - **Superinteligencia segura:** la actual.
  - **Gobernanza mundial:** consigues que al menos 5 de 8 bloques ratifiquen un *Tratado de Control de la IA*. Requiere relaciones, ayuda y prestigio, y una votación anual en una «Asamblea» (como el Congreso Mundial de *Civilization*).
  - **Hegemonía del silicio:** controlas el 60 % de la producción mundial de chips durante 5 años seguidos.
  - **Custodio:** eres el bloque con mejor alineamiento cuando cualquiera enciende una superinteligencia segura, y tus investigaciones de seguridad compartidas la hicieron posible. Es una victoria compartida o «moral».
  - **Supervivencia:** en modo Pionero o en escenarios de crisis climática.
- **Por qué:** distintas rutas significan distintas partidas, y la rejugabilidad de *Civilization* nace exactamente de ahí.
- **Dónde:**
  - `endGame()` y `outcome` en `types.ts`;
  - panel «Caminos a la victoria» en `OverviewPanel`, con el progreso de cada ruta;
  - la Asamblea, como evento periódico tras 1990.
- **Comprobar:** el bot de pruebas ajustado a cada estrategia puede ganar por cada ruta. Ninguna ruta gana en más del 40 % de las partidas de un bot equilibrado.
- **Esfuerzo:** L.

### 1.4 Doctrinas excluyentes (decisiones que cierran puertas)
- **Qué:** tres o cuatro bifurcaciones históricas que se eligen una sola vez:
  - **1970 — Modelo de investigación:** académica abierta (más investigación, te la roban más fácil) frente a secreta militar (menos fugas, menos investigación).
  - **1995 — Arquitectura de cómputo:** centralizada (gigafactorías más baratas y vulnerables a sabotaje) frente a distribuida (más cara y resistente).
  - **2012 — Modelos:** código abierto (todos avanzan, tú ganas relaciones e investigación) frente a cerrado (ventaja propia y tensión mundial).
  - **2020 — Seguridad:** interpretabilidad (alineamiento con techo alto, lento) frente a control y contención (rápido, con riesgo de incidentes).
  
  Cada rama desbloquea 1–2 edificios o decretos únicos y cambia eventos posteriores.
- **Por qué:** las doctrinas de *Hearts of Iron* y los civismos de *Civilization VI* dan identidad a cada partida y obligan a pensar.
- **Dónde:** `src/game/doctrines.ts`, una pantalla de elección en forma de evento grande con ilustración, y efectos vía `addMod` y `isUnlocked`.
- **Comprobar:** dos partidas con doctrinas opuestas difieren de forma clara en la composición final de edificios y en el año de victoria.
- **Esfuerzo:** M.

### 1.5 Mapa de conflicto: regiones disputadas e influencia
- **Qué:**
  - en el mapa mundial (`EvolvingMap`), 6–8 **zonas estratégicas**:
    - Taiwán y los chips;
    - Golfo Pérsico y la energía;
    - Ártico y la refrigeración y los recursos;
    - Congo y los minerales;
    - Panamá y Suez para el comercio;
    - órbita baja para los satélites;
  - cada bloque invierte **influencia** (nuevo recurso que se gana con diplomacia, comercio y propaganda);
  - quien controla una zona recibe su bonificación;
  - perder una zona activa crisis (por ejemplo, un bloqueo de chips).
- **Por qué:** el control de regiones de *Twilight Struggle* es el mejor modelo de Guerra Fría que existe y encaja con la estética del juego.
- **Dónde:** `src/game/zones.ts`, una vista «WORLD» interactiva y acciones nuevas `INFLUENCE` y `COUP` (golpe o propaganda).
- **Comprobar:** cada zona cambia de manos al menos una vez en la mitad de las partidas, y controlarla se nota en la economía.
- **Esfuerzo:** L.

### 1.6 Cadenas de suministro entre bloques
- **Qué:** los chips y el uranio viajan por rutas visibles en el mapa mundial. Embargos, bloqueos navales y sabotaje de rutas afectan al precio y a la disponibilidad.
- **Por qué:** convierte el mercado abstracto en geopolítica que se ve. La logística es el corazón de *Anno* y de *Victoria*.
- **Dónde:** `market.ts`, que pasa a tener precios por bloque según las rutas y las zonas.
- **Esfuerzo:** M.

---

## 2. Ritmo, profundidad y decisiones interesantes (P1–P2)

### 2.1 Eliminar los años muertos
- **Qué:**
  - medir con `tools/sim/events.ts` las decisiones por minuto de juego real;
  - fijar un objetivo de 1 decisión significativa cada 20–40 s;
  - rellenar los huecos (1980–2005 y 2020–2030) con microobjetivos («llega a 10^15 antes que la URSS»), proyectos nacionales de varias fases (como las maravillas de *Civilization*) y eventos encadenados.
- **Comprobar:** el gráfico de decisiones por año no tiene tramos vacíos de más de 2 años de juego.
- **Esfuerzo:** M.

### 2.2 Proyectos nacionales (maravillas)
- **Qué:** construcciones únicas de varias fases. Solo puede completarlas un bloque en el mundo, que obtiene una bonificación permanente:
  - Programa Apolo del Cómputo;
  - Red Mundial de Satélites;
  - Fábrica de Chips de 1 nm;
  - Instituto Mundial de Alineamiento;
  - Ciudad Inteligente.

  Los rivales compiten por ellas y se ve su avance.
- **Por qué:** carreras dentro de la carrera, con un objetivo concreto a medio plazo.
- **Esfuerzo:** M.

### 2.3 Cadenas de eventos con consecuencias
- **Qué:** que las decisiones vuelvan años después. Ejemplos:
  - el desertor al que diste asilo descifra un código rival en 1990;
  - el encubrimiento de un incidente se filtra en 2015.
- **Por qué:** es la fuerza de *Frostpunk* y *Crusader Kings*: tus decisiones tienen historia.
- **Dónde:** `s.flags` (nuevo) y eventos con `when: s => s.flags.includes('defector_asylum')`.
- **Comprobar:** al menos 10 cadenas de 2–3 eslabones.
- **Esfuerzo:** M.

### 2.4 Grandes científicos (cartas de personaje)
- **Qué:**
  - 20–30 personajes históricos de la IA y la computación (Turing, von Neumann, Hopper, McCarthy, Minsky, Hinton, LeCun, Bengio, Fei-Fei Li, Hassabis…);
  - aparecen por era, se fichan con dinero o prestigio y se pueden perder por fuga de cerebros o robar con espionaje;
  - cada uno da una bonificación única y puede liderar un proyecto.
- **Por qué:** los Grandes Personajes de *Civilization* y los líderes de *Stellaris* dan cara y apego a los números.
- **Dónde:** `src/game/people.ts`, un panel «Talento» y retratos generados con estilo de cartel soviético o americano coherente con las cartas actuales.
- **Ojo:** con personas vivas, usar descripciones respetuosas y sin opiniones inventadas. Si hay dudas, preferir personajes inspirados y no nominales.
- **Esfuerzo:** M (más el arte).

### 2.5 El alineamiento como mecánica, no como barra
- **Qué:** sustituir el «sube con Institutos de Seguridad» por decisiones concretas:
  - **red-teaming:** un minijuego breve o una decisión sobre cuánto tiempo pruebas antes de desplegar;
  - presupuestos de evaluación;
  - incidentes que dependen de tus atajos;
  - el «impuesto de seguridad» de la doctrina elegida.
- **Por qué:** es el tema central del juego y ahora es una barra pasiva.
- **Esfuerzo:** M.

### 2.6 Riesgo y estado de emergencia
- **Qué:** un modo «movilización total» (como la economía de guerra de *Hearts of Iron*): +50 % de cómputo y −aprobación, −alineamiento y +tensión. Es la tentación clásica del final de partida.
- **Esfuerzo:** S.

---

## 3. Claridad e inteligencia del interfaz (P1)

### 3.1 Informe anual
- **Qué:** una tarjeta discreta cada año de juego con 3–5 líneas:
  - qué cambió y por qué («Aprobación −4: impuestos +2 y humo en Siberia»);
  - una sugerencia del consejero.
- **Por qué:** los grandes juegos explican sus sistemas sin manual.
- **Esfuerzo:** S–M.

### 3.2 Desglose en cada número
- **Qué:** todo indicador con un desglose «de dónde sale» al pasar el ratón.
- **Estado actual:** ya está parcialmente en los indicadores. Falta en relaciones, precios, alineamiento y tensión.
- **Esfuerzo:** S.

### 3.3 Mapas de calor superpuestos
- **Qué:** selector de capas: energía, contaminación, felicidad, bonificación por casilla, vulnerabilidad a sabotaje y regiones sin desarrollar.
- **Dónde:** `map/renderer.ts`, que ya tiene caché de terreno y fantasma de colocación.
- **Esfuerzo:** M.

### 3.4 Comparativa contra los rivales
- **Qué:** un panel «Inteligencia mundial» con gráficas temporales de tu bloque frente a los rivales: cómputo, PIB y alineamiento. Los datos de un rival solo se ven exactos si tienes inteligencia sobre él.
- **Esfuerzo:** S.

### 3.5 Consejero de cuello de botella
- **Qué:** detecta el recurso limitante («tu cómputo está frenado por chips: −38 %») y propone 2 acciones con un clic.
- **Esfuerzo:** M.

### 3.6 Menos clics
- **Qué:** cola de construcción, «mejorar todos los de este tipo», atajos para repetir la última construcción y deshacer la última colocación (en los primeros 5 segundos).
- **Esfuerzo:** M.

### 3.7 Español completo y otros idiomas
- **Qué:** extraer todos los textos a `src/i18n/` (es y en como mínimo; después de, fr y pt-BR) y sustituir el traductor automático.
- **Por qué:** Fran y su público hispanohablante. La traducción automática degrada la calidad percibida.
- **Esfuerzo:** L (hay muchos textos), pero mecánico y paralelizable.

---

## 4. Rejugabilidad y progresión (P2)

### 4.1 Escenarios
- **Qué:**
  - 1962 «Crisis de los misiles» (tensión 70);
  - 1991 «Fin de la Guerra Fría»;
  - 2012 «Revolución del aprendizaje profundo»;
  - 2030 «Mundo en llamas» (planeta al 40 %);
  - «Ucronía»: la URSS no cae.
  
  Cada uno con condiciones iniciales y objetivos propios.
- **Esfuerzo:** M.

### 4.2 Reto diario y semanal
- **Qué:** una semilla compartida con modificadores («sin carbón», «chips al triple»). La clasificación puede publicarse sin servidor, por ejemplo con un dataset gratuito de Hugging Face o con un código de resultado verificable que se comparte.
- **Esfuerzo:** M.

### 4.3 Modificadores de partida
- **Qué:** tamaño del mundo, agresividad de la IA, velocidad de la historia, eventos desactivables y planeta frágil.
- **Esfuerzo:** S.

### 4.4 Finales narrados
- **Qué:** 12–20 epílogos según las cifras finales (planeta, aprobación, alineamiento, tratados, quién ganó), presentados como una portada de periódico de la época con titular y fotografía.
- **Por qué:** los finales de *Frostpunk* y *Fallout* hacen que la partida cuente una historia.
- **Esfuerzo:** M.

### 4.5 Progresión entre partidas
- **Qué:** logros (ya hay 15; ampliar a 50), retratos y estandartes desbloqueables y un «expediente» por facción con el historial de partidas. Que sea cosmético: no debe romper el equilibrio.
- **Esfuerzo:** S–M.

---

## 5. Multijugador de primera (P2)

### 5.1 Reconexión
Si un jugador recarga la página, vuelve a su bloque. Para eso, el anfitrión guarda el estado resumido de cada humano y lo devuelve al reconectar. **M**

### 5.2 Guardar y reanudar partidas multijugador
El anfitrión guarda la partida completa y, al reabrir la sala con el mismo código, cada jugador recupera su nación desde su guardado local. **M**

### 5.3 Equipos y alianzas formales
Modo «Bloque Occidental contra Bloque Oriental» con investigación compartida, chat de equipo y victoria conjunta. **M**

### 5.4 Acuerdos a medida
Un editor de propuestas: dinero, chips, acero, tratados, no agresión durante X años e intercambio de inteligencia. La otra parte acepta o rechaza, y si se incumple se aplica la sanción pactada. **M**

### 5.5 Espectadores y repetición
Los espectadores ven la franja mundial. Al final hay una repetición rápida con la línea temporal de los momentos clave. **M**

### 5.6 Partidas asíncronas («por correo»)
Turnos anuales en los que cada jugador decide cuando puede durante días, con estado compartido mediante código o un archivo. **L**

### 5.7 Fiabilidad de red
- Servidor TURN opcional (configurable por el usuario) para redes estrictas.
- Indicador de latencia por jugador.
- Reintentos ya existen; falta probar con 4–8 jugadores reales.

**M**

---

## 6. Ambiente, sonido y «sensación» (P2–P3)

### 6.1 Banda sonora adaptativa
Capas musicales por era (años 60 de sintetizador analógico, años 80 electrónica, actualidad orquestal e híbrida) que se intensifican con el DEFCON y con los proyectos ASI. **M**

### 6.2 Voz de los líderes
Frases cortas de amenaza, saludo y acuerdo para los 8 líderes en inglés y en español, con TTS de calidad, revisadas por Fran. **M**

### 6.3 Transiciones de era
Un momento épico al cambiar de era: cinemática de 5 s, titular de periódico, cambio de paleta y de música, y un resumen «tu nación en 1980». **M**

### 6.4 Cinemáticas sin marca de agua
Volver a exportar los vídeos de PixVerse sin la marca de agua, o regenerarlos. **S** (depende del proveedor)

### 6.5 Más vida en el mapa
- Protestas visibles en las ciudades con baja aprobación.
- Desfiles cuando se consigue un hito mundial.
- Apagones que oscurecen barrios.
- Lanzamientos de cohetes coordinados con los hitos.

**M**

### 6.6 Accesibilidad
Modo para daltonismo (los estados no deben depender solo del color), escala de texto, alternativa a mantener el ratón para los desgloses en táctil y subtítulos en las cinemáticas. **S–M**

---

## 7. Calidad técnica (P2)

### 7.1 Partidas guardadas con versión
`save.ts` con número de versión y migraciones, para que las partidas antiguas sigan funcionando con mecánicas nuevas. **S**

### 7.2 Rendimiento
- Medir FPS en un portátil modesto.
- Repartir el renderizado del mapa en más capas cacheadas.
- Bajar efectos automáticamente si los FPS caen de 40.

**M**

### 7.3 Móvil y tableta
Diseño táctil completo (ya existe `mobile.css`) y una PWA instalable. **M**

### 7.4 Pruebas automáticas
- Tests del motor: invariantes sin NaN y conservación de recursos.
- Un barrido de simulaciones en cada commit (CI de GitHub, gratis) que falle si la tasa de victoria del bot sale de la franja del 40–70 %.
- Prueba P2P con dos navegadores (ya existen los guiones en `D:/tmp/terra-mp`; moverlos a `tools/`).

**M**

### 7.5 Telemetría opcional y anónima
Con el consentimiento del jugador: año y causa de cada derrota y facciones elegidas, para equilibrar con datos reales. Sin datos personales. **M**

---

## 8. Equilibrio (continuo)

### 8.1 Pruebas con personas
3–5 jugadores durante una tarde, grabando la pantalla y apuntando dónde se atascan, qué no entienden y cuándo se aburren. **Ninguna simulación sustituye esto.**

### 8.2 Bot de pruebas mejor
Ahora se estanca al final (no construye bien las gigafactorías). Un bot más fuerte da medidas de dificultad más fiables. **M**

### 8.3 Simetría de facciones
- Objetivo: ninguna facción por debajo del 35 % ni por encima del 75 % de victorias del bot en dificultad normal.
- Oceanía es ahora la más débil (2/6) y conviene revisar su escasez de mano de obra.

### 8.4 Curva de dificultad
- Fácil: perdonar errores de 1–2 años.
- Difícil: IA que espía y sabotea con criterio.
- Nueva dificultad «Doomsday»: la IA coopera contra el líder.

---

## 9. Distribución y comunidad (P3)

### 9.1 Steam
Ya hay base en Electron, con el paquete en `distribution/`. Añadir logros de Steam y multijugador por invitación de amigos. **L**

### 9.2 Página del juego
Tráiler de 60 s con capturas del mapa, la sala de guerra y DEFCON, y una explicación en 3 frases. **M**

### 9.3 Editor de escenarios y mods
Escenarios en JSON (eventos, rivales, condiciones de inicio) que la comunidad pueda compartir. **L**

### 9.4 Prensa y comunidad
Un Discord o subforo, un registro de cambios público y torneos con semilla fija. **S**

---

## 10. Hoja de ruta propuesta

| Fase | Puntos | Resultado | Esfuerzo total |
|---|---|---|---|
| **A — Rivales vivos** | 1.1, 1.2, 8.2 | La IA juega con tus reglas, recuerda y negocia | L |
| **B — Caminos y doctrinas** | 1.3, 1.4, 2.6 | Varias formas de ganar y decisiones que cierran puertas | L |
| **C — Claridad y español** | 3.1–3.7, 7.1 | Juego comprensible sin manual y en español | L |
| **D — Tablero de la Guerra Fría** | 1.5, 1.6, 2.2 | Zonas disputadas, influencia, rutas, maravillas | L |
| **E — Historia viva** | 2.3, 2.4, 2.5, 4.4 | Cadenas de eventos, científicos, alineamiento jugable, finales | L |
| **F — Ambiente** | 6.1–6.6 | Música adaptativa, voces, transiciones de era, accesibilidad | M–L |
| **G — Multijugador avanzado** | 5.1–5.7 | Reconexión, guardado, equipos, acuerdos, asíncrono | L |
| **H — Rejugabilidad** | 4.1–4.3, 4.5 | Escenarios, reto diario, modificadores, progresión | M |
| **I — Técnica y lanzamiento** | 7.2–7.5, 9.x | Rendimiento, móvil, CI de equilibrio, Steam, tráiler | L |

**Pruebas con personas (8.1):** al final de las fases A, B y D como mínimo.

**Criterio de «gran juego de estrategia»:**
1. Al menos tres estrategias ganadoras distintas.
2. La IA reacciona de forma visible a lo que haces.
3. Hay una decisión interesante cada menos de 40 s.
4. Un jugador nuevo entiende por qué gana o pierde.
5. La gente quiere jugar «una partida más».
