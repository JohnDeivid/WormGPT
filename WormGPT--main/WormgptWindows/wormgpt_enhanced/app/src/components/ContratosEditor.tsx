import React from 'react';
import './ContratosEditor.css';

interface ContratosEditorProps {
  zoom: number;
}

export const ContratosEditor: React.FC<ContratosEditorProps> = ({ zoom }) => {
  return (
    <div className="editor-canvas" id="editorCanvas">
      <div 
        className="canvas-inner" 
        id="canvasInner"
        style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
      >
        <div className="contract-container" id="contractContainer">

                        {/*  PÁGINA 1  */}
                        <div className="page" contentEditable={true}>
                            <div className="page-header">
                                <div>Contrato de Servicios Profesionales</div>
                                <div><span data-placeholder="fecha" contentEditable={true}>[Día / Mes / Año]</span>
                                </div>
                            </div>
                            <div className="header-line"></div>

                            <div className="cover-content">
                                <div className="cover-title">Contrato de<br />Prestación de Servicios<br />profesionales
                                    independientes</div>
                                <div className="cover-subtitle">
                                    <strong>Contratante:</strong> <span data-placeholder="cliente-nombre"
                                        contentEditable={true}>[Nombre o
                                        Razón Social del Cliente]</span><br />
                                    <strong>Contratista:</strong> <span data-placeholder="diseñador-nombre"
                                        contentEditable={true}>[Tu
                                        Nombre / Nombre de tu Estudio]</span><br />
                                    <strong>Fecha de Emisión:</strong> <span data-placeholder="fecha-emision"
                                        contentEditable={true}>[Día
                                        / Mes / Año]</span>
                                </div>
                            </div>

                            <div className="page-footer">
                                <div className="footer-left">Contrato de Servicios Independientes de Diseño y Desarrollo Web
                                </div>
                                <div className="footer-right">Página 1 de 7</div>
                            </div>
                        </div>

                        {/*  PÁGINA 2  */}
                        <div className="page" contentEditable={true}>
                            <div className="page-header">
                                <div>Contrato de Servicios Profesionales</div>
                                <div><span data-placeholder="fecha">[Día / Mes / Año]</span></div>
                            </div>
                            <div className="header-line"></div>

                            <h1>1. Objeto del Contrato y Comparecencia</h1>

                            <p className="clause-text" style={{"marginBottom":"20px","lineHeight":"1.6"}}>
                                En la ciudad de Santo Domingo, República Dominicana, al <span
                                    data-placeholder="fecha-contrato">[Día /
                                    Mes / Año]</span>, intervienen por una parte <strong><span
                                        data-placeholder="cliente-razon">[Nombre o
                                        Razón Social del Cliente]</span></strong>, con domicilio fiscal en <span
                                    data-placeholder="cliente-direccion">[Dirección del Cliente]</span>, Registro
                                Nacional de
                                Contribuyente / Cédula No. <span data-placeholder="cliente-rnc">[000-0000000-0]</span>,
                                legítimamente
                                representada por su representante legal <span data-placeholder="cliente-rep">[Nombre del
                                    Representante]</span> (en adelante, el "Cliente"); y por la otra parte <strong><span
                                        data-placeholder="diseñador-razon">[Tu Nombre / Nombre de tu
                                        Estudio]</span></strong>, con domicilio
                                profesional en <span data-placeholder="diseñador-direccion">[Tu Dirección]</span>,
                                Cédula No. <span data-placeholder="diseñador-cedula">[000-0000000-0]</span> (en
                                adelante, el "Diseñador"). Ambas partes
                                se reconocen de mutuo acuerdo capacidad legal suficiente para obligarse y suscribir este
                                <strong>Contrato de Prestación de Servicios Profesionales Independientes</strong> bajo
                                las siguientes
                                cláusulas:
                            </p>

                            <div className="clause">
                                <div className="clause-title">1.1. Alcance de los Servicios</div>
                                <div className="clause-text">
                                    El Diseñador desarrollará e implementará el proyecto digital de acuerdo con las
                                    siguientes fases de
                                    trabajo técnico y creativo previamente aceptadas:
                                    <ul>
                                        <li><strong>Fase 1: Inv. de Mercado y Estrategia SEO</strong>: Análisis del
                                            mercado objetivo,
                                            estudio de competidores directos y definición de la arquitectura web con
                                            estrategia SEO inicial
                                            (jerarquía, palabras clave y estructura de navegación).</li>
                                        <li><strong>Fase 2: Propuesta de Diseño y Aprobación</strong>: Creación del
                                            diseño visual (UI) y
                                            experiencia de usuario (UX). Involucra la presentación del prototipo
                                            interactivo con la propuesta
                                            cromática y tipográfica, incluyendo las rondas de revisión hasta su
                                            aprobación formal.</li>
                                        <li><strong>Fase 3: Desarrollo y Maquetación</strong>: Programación e
                                            implementación del diseño
                                            visual aprobado en la plataforma, configuración de la arquitectura
                                            interactiva, animaciones y
                                            optimización multiplataforma.</li>
                                        <li><strong>Fase 4: Pruebas (QA) y Lanzamiento</strong>: Fase de prueba en un
                                            entorno seguro
                                            (staging), optimización técnica de rendimiento, vinculación del dominio
                                            personalizado y el
                                            lanzamiento oficial del proyecto al público.</li>
                                    </ul>
                                </div>
                            </div>

                            <div className="clause" style={{"marginBottom":"0"}}>
                                <div className="clause-title">1.2. Cronograma Estimado</div>
                                <div className="clause-text">
                                    El cronograma de ejecución consta de 8 semanas, contadas a partir del pago del
                                    anticipo y la recepción
                                    del material inicial del Cliente:
                                </div>

                                {/*  Gráfica Gantt  */}
                                <div className="gantt">
                                    <div className="gantt-axis">
                                        <div className="gantt-tick" style={{"left":"0%"}}><span className="gantt-tick-label">SEM
                                                1</span></div>
                                        <div className="gantt-tick" style={{"left":"14.3%"}}><span className="gantt-tick-label">SEM
                                                2</span></div>
                                        <div className="gantt-tick" style={{"left":"28.6%"}}><span className="gantt-tick-label">SEM
                                                3</span></div>
                                        <div className="gantt-tick" style={{"left":"42.9%"}}><span className="gantt-tick-label">SEM
                                                4</span></div>
                                        <div className="gantt-tick" style={{"left":"57.1%"}}><span className="gantt-tick-label">SEM
                                                5</span></div>
                                        <div className="gantt-tick" style={{"left":"71.4%"}}><span className="gantt-tick-label">SEM
                                                6</span></div>
                                        <div className="gantt-tick" style={{"left":"85.7%"}}><span className="gantt-tick-label">SEM
                                                7</span></div>
                                        <div className="gantt-tick" style={{"left":"100%"}}><span className="gantt-tick-label">SEM
                                                8</span></div>
                                    </div>
                                    <div className="gantt-phases">
                                        <div className="gantt-phase" style={{"left":"0%","width":"25%"}}>
                                            <div className="gantt-phase-text"><strong>FASE 1</strong><br />Inv. &amp; SEO
                                            </div>
                                        </div>
                                        <div className="gantt-phase" style={{"left":"25%","width":"25%"}}>
                                            <div className="gantt-phase-text"><strong>FASE 2</strong><br />Diseño UI/UX</div>
                                        </div>
                                        <div className="gantt-phase" style={{"left":"50%","width":"25%"}}>
                                            <div className="gantt-phase-text"><strong>FASE 3</strong><br />Desarrollo</div>
                                        </div>
                                        <div className="gantt-phase" style={{"left":"75%","width":"25%"}}>
                                            <div className="gantt-phase-text"><strong>FASE 4</strong><br />Pruebas &amp; Lanz.
                                            </div>
                                        </div>
                                    </div>
                                    <div className="gantt-drop-lines">
                                        <div className="gantt-drop" style={{"left":"0%"}}>
                                            <div className="gantt-drop-content" style={{"top":"65px"}}><span
                                                    className="gantt-ms-title">Inicio</span><br /><span
                                                    className="gantt-ms-desc">Kickoff y Material</span>
                                            </div>
                                        </div>
                                        <div className="gantt-drop" style={{"left":"25%"}}>
                                            <div className="gantt-drop-content" style={{"top":"100px"}}><span
                                                    className="gantt-ms-title">Hito
                                                    1</span><br /><span className="gantt-ms-desc">Estrategia SEO</span></div>
                                        </div>
                                        <div className="gantt-drop" style={{"left":"50%"}}>
                                            <div className="gantt-drop-content" style={{"top":"65px"}}><span
                                                    className="gantt-ms-title">Hito
                                                    2</span><br /><span className="gantt-ms-desc">Aprobación Diseño</span>
                                            </div>
                                        </div>
                                        <div className="gantt-drop" style={{"left":"75%"}}>
                                            <div className="gantt-drop-content" style={{"top":"100px"}}><span
                                                    className="gantt-ms-title">Hito
                                                    3</span><br /><span className="gantt-ms-desc">Entorno de Pruebas</span>
                                            </div>
                                        </div>
                                        <div className="gantt-drop"
                                            style={{"left":"auto","right":"0","borderLeft":"none","borderRight":"1px dashed #999"}}>
                                            <div className="gantt-drop-content"
                                                style={{"top":"65px","left":"auto","right":"4px","textAlign":"right","width":"100px"}}>
                                                <span className="gantt-ms-title">Entrega Final</span><br /><span
                                                    className="gantt-ms-desc">Lanzamiento
                                                    Oficial</span></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="page-footer">
                                <div className="footer-left">Contrato de Servicios Independientes de Diseño y Desarrollo Web
                                </div>
                                <div className="footer-right">Página 2 de 7</div>
                            </div>
                        </div>

                        {/*  PÁGINA 3  */}
                        <div className="page" contentEditable={true}>
                            <div className="page-header">
                                <div>Contrato de Servicios Profesionales</div>
                                <div><span data-placeholder="fecha">[Día / Mes / Año]</span></div>
                            </div>
                            <div className="header-line"></div>

                            <h1>2. Presupuesto y Plan de Pagos</h1>

                            <p className="clause-text" style={{"marginBottom":"20px"}}>Los precios listados a continuación
                                representan el
                                presupuesto consolidado y acordado para el desarrollo integral del proyecto. Cualquier
                                servicio
                                adicional no descrito explícitamente en el Alcance de Servicios será objeto de una
                                tarificación
                                independiente.</p>

                            <div className="clause">
                                <div className="clause-title">2.1. Desglose Financiero</div>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Descripción del Servicio</th>
                                            <th className="align-right">Monto</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td>Investigación de Mercado, SEO y Propuesta de Diseño (Fases 1 y 2)</td>
                                            <td className="align-right"><span data-placeholder="monto-f1f2">$[Monto
                                                    F1-F2]</span></td>
                                        </tr>
                                        <tr>
                                            <td>Desarrollo, Maquetación y Programación Front-End (Fase 3)</td>
                                            <td className="align-right"><span data-placeholder="monto-dev">$[Monto
                                                    Desarrollo]</span></td>
                                        </tr>
                                        <tr>
                                            <td>Fase de Pruebas, QA, Conexión de Dominio y Lanzamiento (Fase 4)</td>
                                            <td className="align-right"><span data-placeholder="monto-deploy">$[Monto
                                                    Despliegue]</span></td>
                                        </tr>
                                        <tr className="bold-row">
                                            <td>Total Presupuesto (Neto)</td>
                                            <td className="align-right"><span data-placeholder="monto-total">$[Monto
                                                    Total]</span></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <div className="clause" style={{"marginBottom":"0"}}>
                                <div className="clause-title">2.2. Calendario de Pagos</div>
                                <div className="clause-text">
                                    El Cliente se compromete a abonar los honorarios del Diseñador conforme al siguiente
                                    plan de hitos
                                    financieros obligatorios:
                                    <ul>
                                        <li><strong>50% de Anticipo (<span data-placeholder="monto-anticipo">$[Monto
                                                    Anticipo]</span>)</strong>: Requerido para reservar la
                                            disponibilidad del Diseñador e iniciar
                                            formalmente el proyecto.</li>
                                        <li><strong>25% al Aprobar Diseño (<span data-placeholder="monto-hito2">$[Monto
                                                    Hito
                                                    2]</span>)</strong>: Facturado tras la aprobación formal de la Fase
                                            2 (diseño visual) y previo
                                            al inicio del desarrollo web.</li>
                                        <li><strong>25% a la Entrega Final (<span data-placeholder="monto-hito3">$[Monto
                                                    Hito
                                                    3]</span>)</strong>: Pagadero tras la aprobación en la fase de
                                            pruebas, previo a la conexión
                                            del dominio final y traspaso de propiedad del proyecto.</li>
                                    </ul>
                                </div>
                            </div>

                            <div className="page-footer">
                                <div className="footer-left">Contrato de Servicios Independientes de Diseño y Desarrollo Web
                                </div>
                                <div className="footer-right">Página 3 de 7</div>
                            </div>
                        </div>

                        {/*  PÁGINA 4  */}
                        <div className="page" contentEditable={true}>
                            <div className="page-header">
                                <div>Contrato de Servicios Profesionales</div>
                                <div><span data-placeholder="fecha">[Día / Mes / Año]</span></div>
                            </div>
                            <div className="header-line"></div>

                            <h1>3. Términos y Condiciones Básicos</h1>

                            <div className="clause">
                                <div className="clause-title">3.1. Vigencia del Contrato</div>
                                <div className="clause-text">El presente contrato entra en vigor y resulta plenamente
                                    vinculante a partir de
                                    la fecha de su firma por ambas partes, manteniéndose vigente hasta la entrega
                                    definitiva de los
                                    servicios descritos o la rescisión formal del mismo conforme a los mecanismos
                                    previstos en este
                                    documento.</div>
                            </div>

                            <div className="clause">
                                <div className="clause-title">3.2. Modificaciones al Alcance del Proyecto</div>
                                <div className="clause-text">El Diseñador documentará y notificará cualquier solicitud del
                                    Cliente que
                                    exceda el alcance inicial del proyecto. Las modificaciones menores solicitadas fuera
                                    del alcance
                                    acordado serán tarificadas a la tarifa de <strong>$75.00 por hora</strong>. Las
                                    modificaciones
                                    sustanciales que alteren el tiempo o presupuesto del proyecto en un <strong>15% o
                                        más</strong>
                                    requerirán la redacción de una adenda complementaria firmada por ambas partes antes
                                    de que el trabajo
                                    comience.</div>
                            </div>

                            <div className="clause">
                                <div className="clause-title">3.3. Retrasos y Suspensión</div>
                                <div className="clause-text">Si el Cliente no entrega el material requerido (textos,
                                    imágenes, accesos) o
                                    demora las aprobaciones por más de diez (10) días hábiles consecutivos, el proyecto
                                    podrá ser puesto
                                    en suspensión. En tal caso, el Diseñador aplicará un recargo fijo por suspensión de
                                    <strong>$50.00 USD
                                        por cada semana de retraso</strong> para compensar la reserva de su agenda
                                    bloqueada, y los plazos
                                    de entrega se reprogramarán según su disponibilidad.</div>
                            </div>

                            <div className="clause">
                                <div className="clause-title">3.4. Pruebas y Aceptación</div>
                                <div className="clause-text">El Diseñador notificará al Cliente cuando cada entregable esté
                                    listo para
                                    revisión. El Cliente dispondrá de un plazo de <strong>siete (7) días
                                        hábiles</strong> para revisar los
                                    entregables y notificar por escrito cualquier objeción o corrección necesaria
                                    respecto al cumplimiento
                                    de las especificaciones. En ausencia de dicha notificación, los entregables se
                                    considerarán aceptados
                                    de forma definitiva, habilitando la facturación del hito correspondiente.</div>
                            </div>

                            <div className="clause">
                                <div className="clause-title">3.5. Derecho de Subsanación</div>
                                <div className="clause-text">Si el Cliente notifica desviaciones justificadas en los
                                    entregables dentro del
                                    plazo de aceptación, el Diseñador tendrá derecho a subsanar y corregir dicho
                                    entregable en un plazo
                                    comercial razonable sin que esto se considere un incumplimiento contractual.</div>
                            </div>

                            <div className="clause" style={{"marginBottom":"0"}}>
                                <div className="clause-title">3.6. Promoción y Portafolio</div>
                                <div className="clause-text">El Cliente acepta que el Diseñador pueda incluir un enlace de
                                    atribución
                                    discreto en el pie de página del sitio web final (ej. <em>"Diseño y desarrollo por
                                        [Tu Nombre]"</em>),
                                    y utilizar capturas de pantalla, fragmentos de diseño y descripciones del sitio web
                                    para fines de
                                    portafolio profesional y redes sociales, una vez que el sitio sea lanzado
                                    oficialmente al público.
                                </div>
                            </div>

                            <div className="page-footer">
                                <div className="footer-left">Contrato de Servicios Independientes de Diseño y Desarrollo Web
                                </div>
                                <div className="footer-right">Página 4 de 7</div>
                            </div>
                        </div>

                        {/*  PÁGINA 5  */}
                        <div className="page" contentEditable={true}>
                            <div className="page-header">
                                <div>Contrato de Servicios Profesionales</div>
                                <div><span data-placeholder="fecha">[Día / Mes / Año]</span></div>
                            </div>
                            <div className="header-line"></div>

                            <h1>4. Propiedad Intelectual y Confidencialidad</h1>

                            <div className="clause">
                                <div className="clause-title">4.1. Cesión de Derechos sobre el Trabajo Final</div>
                                <div className="clause-text">Sujeto al cumplimiento y al <strong>pago completo</strong> de
                                    todas las tarifas
                                    y facturas por parte del Cliente, el Diseñador cede de forma exclusiva y definitiva
                                    al Cliente todos
                                    los derechos de propiedad intelectual, derechos de autor y marcas registradas sobre
                                    los
                                    <strong>Trabajos Finales</strong> creados específicamente para este proyecto (el
                                    diseño visual del
                                    sitio web y el contenido desarrollado específicamente para el Cliente).
                                </div>
                            </div>

                            <div className="clause">
                                <div className="clause-title">4.2. Reserva de Obras Preliminares</div>
                                <div className="clause-text">El Diseñador retiene todos los derechos de propiedad
                                    intelectual, autoría y
                                    propiedad sobre las <strong>Obras Preliminares</strong> (bocetos no seleccionados,
                                    propuestas de
                                    diseño alternativas rechazadas y archivos de trabajo previos al diseño definitivo).
                                    El Cliente se
                                    compromete a no utilizar, publicar ni copiar ninguna de estas obras preliminares, y
                                    a devolverlas o
                                    destruirlas si están en su posesión, en un plazo de treinta (30) días tras el cierre
                                    del proyecto.
                                </div>
                            </div>

                            <div className="clause">
                                <div className="clause-title">4.3. Herramientas del Diseñador (Designer Tools)</div>
                                <div className="clause-text">Las partes reconocen que el Diseñador utiliza y desarrolla
                                    herramientas y
                                    metodologías de diseño y desarrollo preexistentes en su práctica profesional
                                    (incluyendo, sin
                                    limitación, fragmentos de código, plantillas, components reutilizables y librerías).
                                    El Diseñador
                                    retiene la propiedad intelectual exclusiva de las "Herramientas del Diseñador". El
                                    Diseñador otorga al
                                    Cliente una licencia no exclusiva, perpetua, transferible únicamente con el sitio
                                    web, y libre de
                                    regalías para utilizar las Herramientas del Diseñador integradas en el sitio web
                                    final para su normal
                                    funcionamiento.</div>
                            </div>

                            <div className="clause">
                                <div className="clause-title">4.4. Materiales de Terceros</div>
                                <div className="clause-text">El Cliente reconoce que el sitio web puede incorporar
                                    materiales de terceros
                                    (como tipografías web bajo licencia, imágenes de stock, componentes o plugins). El
                                    Cliente será el
                                    único responsable de adquirir cualquier tarifa de licencia necesaria para dichos
                                    recursos a su nombre,
                                    y el Diseñador no asumirá responsabilidad por infracción de derechos sobre recursos
                                    provistos por el
                                    Cliente.</div>
                            </div>

                            <div className="clause">
                                <div className="clause-title">4.5. Garantía de Originalidad del Diseñador</div>
                                <div className="clause-text">El Diseñador garantiza que, a su leal saber y entender, todos
                                    los Trabajos
                                    Finales creados para el Cliente son originales y no infringen los derechos de
                                    propiedad intelectual de
                                    terceros. Esta garantía se limita "al mejor conocimiento" del Diseñador, dado que
                                    este no realiza
                                    búsquedas de marcas registradas o patentes, siendo esto responsabilidad del Cliente.
                                </div>
                            </div>

                            <div className="clause" style={{"marginBottom":"0"}}>
                                <div className="clause-title">4.6. Acuerdo de Confidencialidad Cruzado</div>
                                <div className="clause-text">Ambas partes se obligan a mantener estricta reserva y
                                    confidencialidad sobre
                                    toda la información comercial, técnica, estratégica, contraseñas o modelos de
                                    negocio compartidos
                                    durante la ejecución del proyecto. Ninguna de las partes podrá divulgar, transferir
                                    ni explotar dicha
                                    información sin la autorización expresa y por escrito de la otra parte.</div>
                            </div>

                            <div className="page-footer">
                                <div className="footer-left">Contrato de Servicios Independientes de Diseño y Desarrollo Web
                                </div>
                                <div className="footer-right">Página 5 de 7</div>
                            </div>
                        </div>

                        {/*  PÁGINA 6  */}
                        <div className="page" contentEditable={true}>
                            <div className="page-header">
                                <div>Contrato de Servicios Profesionales</div>
                                <div><span data-placeholder="fecha">[Día / Mes / Año]</span></div>
                            </div>
                            <div className="header-line"></div>

                            <h1>5. Servicios Web e Interactivos</h1>

                            <div className="clause">
                                <div className="clause-title">5.1. Periodo de Garantía Técnica</div>
                                <div className="clause-text">
                                    Tras la entrega final del sitio web y el pago correspondiente, se inicia un
                                    <strong>Periodo de
                                        Garantía de treinta (30) días naturales</strong>. Durante este tiempo, el
                                    Diseñador corregirá de
                                    forma gratuita cualquier error de visualización o fallo técnico directamente
                                    derivado de su entrega.
                                    Esta garantía no cubre problemas causados por el servicio de alojamiento,
                                    modificaciones realizadas
                                    por el Cliente o terceros ajenos al proyecto, ni actualizaciones mayores en
                                    plataformas de terceros
                                    posteriores al lanzamiento.
                                </div>
                            </div>

                            <div className="clause">
                                <div className="clause-title">5.2. Mantenimiento y Soporte Post-Garantía</div>
                                <div className="clause-text">Una vez finalizado el periodo de garantía, el Cliente podrá
                                    contratar un plan
                                    de soporte y actualización técnica opcional. Si se pacta, el plan tendrá una
                                    duración mínima de doce
                                    (12) meses a razón de una tarifa fija mensual de <strong>$150.00 al mes</strong>, la
                                    cual incluirá dos
                                    (2) horas de mantenimiento preventivo, actualizaciones de contenido básico y
                                    monitorización técnica
                                    del sitio.</div>
                            </div>

                            <div className="clause">
                                <div className="clause-title">5.3. Compatibilidad de Navegadores</div>
                                <div className="clause-text">El Diseñador se compromete a que el sitio web funcione y se
                                    visualice de forma
                                    consistente en las últimas dos (2) versiones estables y oficiales de los navegadores
                                    más utilizados:
                                    Google Chrome, Apple Safari, Mozilla Firefox y Microsoft Edge. No se garantiza
                                    compatibilidad con
                                    versiones obsoletas de navegadores.</div>
                            </div>

                            <div className="clause">
                                <div className="clause-title">5.4. Cumplimiento de Leyes y Accesibilidad</div>
                                <div className="clause-text">El Diseñador pondrá sus mejores esfuerzos comerciales para que
                                    el sitio cumpla
                                    con estándares de accesibilidad actuales. Sin embargo, el Cliente reconoce y acepta
                                    que él es el único
                                    responsable de asegurar el cumplimiento legal general del sitio web (incluyendo
                                    normativas de
                                    accesibilidad ADA, regulaciones de protección de datos como RGPD/CCPA, políticas de
                                    cookies,
                                    privacidad y veracidad del contenido).</div>
                            </div>

                            <div className="clause">
                                <div className="clause-title">5.5. Independencia Laboral</div>
                                <div className="clause-text">Las partes declaran expresamente que la relación jurídica que
                                    las une es
                                    exclusivamente de carácter civil y comercial, actuando el Diseñador como un
                                    contratista independiente.
                                    El presente acuerdo no genera relación laboral, vínculo de subordinación jurídica ni
                                    de dependencia de
                                    ningún tipo entre el Cliente y el Diseñador, quedando exentos del pago de
                                    prestaciones o de seguridad
                                    social reguladas por el Código de Trabajo de la República Dominicana.</div>
                            </div>

                            <div className="clause" style={{"marginBottom":"0"}}>
                                <div className="clause-title">5.6. Limitación de Responsabilidad y Ley Aplicable</div>
                                <div className="clause-text">El Diseñador provee sus servicios "tal cual". En ninguna
                                    circunstancia la
                                    responsabilidad del Diseñador excederá el monto total de los honorarios pagados por
                                    el Cliente bajo
                                    este acuerdo. Este Contrato se regirá e interpretará conforme a las leyes de la
                                    <strong>República
                                        Dominicana</strong>. Para cualquier controversia que no pueda ser resuelta de
                                    mutuo acuerdo, las
                                    partes se someten expresamente a la jurisdicción exclusiva de los tribunales de
                                    <strong>Santo
                                        Domingo</strong>, renunciando a cualquier otro fuero.</div>
                            </div>

                            <div className="page-footer">
                                <div className="footer-left">Contrato de Servicios Independientes de Diseño y Desarrollo Web
                                </div>
                                <div className="footer-right">Página 6 de 7</div>
                            </div>
                        </div>

                        {/*  PÁGINA 7  */}
                        <div className="page" contentEditable={true}>
                            <div className="page-header">
                                <div>Contrato de Servicios Profesionales</div>
                                <div><span data-placeholder="fecha">[Día / Mes / Año]</span></div>
                            </div>
                            <div className="header-line"></div>

                            <h1>6. Aceptación y Firmas</h1>

                            <div className="clause">
                                <div className="clause-title">Rescisión y Terminación del Acuerdo:</div>
                                <div className="clause-text">
                                    Cualquiera de las partes puede rescindir este contrato mediante notificación por
                                    escrito con al menos
                                    cinco (5) días laborables de anticipación. En caso de rescisión unilateral por parte
                                    del Cliente sin
                                    mediar incumplimiento por parte del Diseñador, el Cliente se compromete a abonar el
                                    100% del costo de
                                    la fase del proyecto que se encuentre activa al momento de la notificación de
                                    rescisión, además de
                                    saldar en su totalidad los hitos completados y previamente liquidados, como
                                    compensación por el tiempo
                                    y recursos de agenda reservados.
                                </div>
                            </div>

                            <div className="clause">
                                <div className="clause-title">Aceptación de Términos:</div>
                                <div className="clause-text">
                                    Al firmar a continuación, las Partes de mutuo acuerdo aceptan que han leído,
                                    entendido y se
                                    comprometen a cumplir los términos enumerados en este contrato de servicios
                                    independientes de diseño y
                                    desarrollo web.
                                </div>
                            </div>

                            <div className="signature-section">
                                <div className="signature-col">
                                    <div className="signature-line"></div>
                                    <div className="sig-row">
                                        <div className="sig-label">Firma</div>
                                    </div>
                                    <div className="sig-row" style={{"marginTop":"10px"}}>
                                        <div className="sig-label">Fecha</div>
                                        <div className="sig-value"><span data-placeholder="firma-fecha-cliente">[Día / Mes /
                                                Año]</span></div>
                                    </div>
                                    <div className="sig-row">
                                        <div className="sig-label">Cédula / RNC</div>
                                        <div className="sig-value"><span
                                                data-placeholder="firma-cedula-cliente">[000-0000000-0]</span></div>
                                    </div>
                                    <div className="sig-name"><span data-placeholder="firma-nombre-cliente">[Nombre y
                                            Apellido Cliente]</span>
                                    </div>
                                    <div className="sig-email"><span
                                            data-placeholder="firma-email-cliente">[correo@dominiodelcliente.com]</span>
                                    </div>
                                </div>

                                <div className="signature-col">
                                    <div className="signature-line"></div>
                                    <div className="sig-row">
                                        <div className="sig-label">Firma</div>
                                    </div>
                                    <div className="sig-row" style={{"marginTop":"10px"}}>
                                        <div className="sig-label">Fecha</div>
                                        <div className="sig-value"><span data-placeholder="firma-fecha-diseñador">[Día / Mes
                                                / Año]</span></div>
                                    </div>
                                    <div className="sig-row">
                                        <div className="sig-label">Cédula / RNC</div>
                                        <div className="sig-value"><span
                                                data-placeholder="firma-cedula-diseñador">[000-0000000-0]</span></div>
                                    </div>
                                    <div className="sig-name"><span data-placeholder="firma-nombre-diseñador">[Tu Nombre y
                                            Apellido]</span>
                                    </div>
                                    <div className="sig-email"><span
                                            data-placeholder="firma-email-diseñador">[hola@tu-estudio.com]</span>
                                    </div>
                                </div>
                            </div>

                            <div className="page-footer">
                                <div className="footer-left">Acuerdo Legal de Servicios Profesionales</div>
                                <div className="footer-right">Cierre</div>
                            </div>
                        </div>

                    </div>
      </div>
    </div>
  );
};
