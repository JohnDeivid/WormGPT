import React, { useEffect, useCallback } from 'react';
import { captureSelection } from './contractUtils';
import type { SelectionInfo } from './contractUtils';

interface ContractDocumentProps {
  onSelectionChange: (info: SelectionInfo) => void;
  onDocumentChange: (html: string, text: string) => void;
  documentRef: React.RefObject<HTMLDivElement | null>;
}

export const ContractDocument: React.FC<ContractDocumentProps> = ({
  onSelectionChange,
  onDocumentChange,
  documentRef,
}) => {
  const handleSelectionChange = useCallback(() => {
    if (!documentRef.current) return;
    const info = captureSelection(documentRef.current);
    onSelectionChange(info);
  }, [onSelectionChange, documentRef]);

  const handleInput = useCallback(() => {
    if (!documentRef.current) return;
    onDocumentChange(
      documentRef.current.innerHTML,
      documentRef.current.innerText || ''
    );
  }, [onDocumentChange, documentRef]);

  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [handleSelectionChange]);

  return (
    <div
      ref={documentRef}
      className="contract-document-root"
      onInput={handleInput}
      contentEditable
      suppressContentEditableWarning
    >
      <div className="document-header">
        <div className="doc-meta">
          <span>Contrato de Servicios Profesionales</span>
          <span className="doc-date" data-placeholder="fecha">[Día / Mes / Año]</span>
        </div>
      </div>

      <div className="cover-content">
        <div className="cover-title">
          Contrato de<br />Prestación de Servicios<br />profesionales<br />independientes
        </div>
        <div className="cover-subtitle">
          <strong>Contratante:</strong>{' '}
          <span data-placeholder="cliente-nombre">[Nombre o Razón Social del Cliente]</span><br />
          <strong>Contratista:</strong>{' '}
          <span data-placeholder="diseñador-nombre">[Tu Nombre / Nombre de tu Estudio]</span><br />
        </div>
      </div>

      <div className="section">
        <h1>1. Objeto del Contrato y Comparecencia</h1>
        <p className="clause-text" style={{ marginBottom: '20px', lineHeight: '1.6' }}>
          En la ciudad de Santo Domingo, República Dominicana, al{' '}
          <span data-placeholder="fecha-contrato">[Día / Mes / Año]</span>, intervienen por una parte{' '}
          <strong><span data-placeholder="cliente-razon">[Nombre o Razón Social del Cliente]</span></strong>,
          con domicilio fiscal en <span data-placeholder="cliente-direccion">[Dirección del Cliente]</span>,
          Registro Nacional de Contribuyente / Cédula No.{' '}
          <span data-placeholder="cliente-rnc">[000-0000000-0]</span>, legítimamente representada por su
          representante legal <span data-placeholder="cliente-rep">[Nombre del Representante]</span>{' '}
          (en adelante, el "Cliente"); y por la otra parte{' '}
          <strong><span data-placeholder="diseñador-razon">[Tu Nombre / Nombre de tu Estudio]</span></strong>,
          con domicilio profesional en <span data-placeholder="diseñador-direccion">[Tu Dirección]</span>,
          Cédula No. <span data-placeholder="diseñador-cedula">[000-0000000-0]</span>{' '}
          (en adelante, el "Diseñador"). Ambas partes se reconocen de mutuo acuerdo capacidad legal suficiente
          para obligarse y suscribir este{' '}
          <strong>Contrato de Prestación de Servicios Profesionales Independientes</strong> bajo las siguientes cláusulas:
        </p>

        <div className="clause">
          <div className="clause-title">1.1. Alcance de los Servicios</div>
          <div className="clause-text">
            El Diseñador desarrollará e implementará el proyecto digital de acuerdo con las siguientes fases
            de trabajo técnico y creativo previamente aceptadas:
            <ul>
              <li><strong>Fase 1: Inv. de Mercado y Estrategia SEO</strong>: Análisis del mercado objetivo, estudio de competidores directos y definición de la arquitectura web con estrategia SEO inicial.</li>
              <li><strong>Fase 2: Propuesta de Diseño y Aprobación</strong>: Creación del diseño visual (UI) y experiencia de usuario (UX). Involucra la presentación del prototipo interactivo con la propuesta cromática y tipográfica, incluyendo las rondas de revisión hasta su aprobación formal.</li>
              <li><strong>Fase 3: Desarrollo y Maquetación</strong>: Programación e implementación del diseño visual aprobado en la plataforma, configuración de la arquitectura interactiva, animaciones y optimización multiplataforma.</li>
              <li><strong>Fase 4: Pruebas (QA) y Lanzamiento</strong>: Fase de prueba en un entorno seguro (staging), optimización técnica de rendimiento, vinculación del dominio personalizado y el lanzamiento oficial del proyecto al público.</li>
            </ul>
          </div>
        </div>

        <div className="clause">
          <div className="clause-title">1.2. Cronograma Estimado</div>
          <div className="clause-text">
            El cronograma de ejecución consta de 8 semanas, contadas a partir del pago del anticipo y la
            recepción del material inicial del Cliente.
          </div>
          <div className="gantt">
            <div className="gantt-axis">
              {['SEM 1','SEM 2','SEM 3','SEM 4','SEM 5','SEM 6','SEM 7','SEM 8'].map((s,i) => (
                <div key={i} className="gantt-tick" style={{ left: `${i*14.28}%` }}>
                  <span className="gantt-tick-label">{s}</span>
                </div>
              ))}
            </div>
            <div className="gantt-phases">
              {[['FASE 1','Inv. & SEO'],['FASE 2','Diseño UI/UX'],['FASE 3','Desarrollo'],['FASE 4','Pruebas & Lanz.']].map(([title, sub], i) => (
                <div key={i} className="gantt-phase" style={{ left: `${i*25}%`, width: '25%' }}>
                  <div className="gantt-phase-text"><strong>{title}</strong><br />{sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="section">
        <h1>2. Presupuesto y Plan de Pagos</h1>
        <p className="clause-text" style={{ marginBottom: '20px' }}>
          Los precios listados a continuación representan el presupuesto consolidado y acordado para el desarrollo
          integral del proyecto. Cualquier servicio adicional no descrito explícitamente en el Alcance de
          Servicios será objeto de una tarificación independiente.
        </p>
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
              <tr><td>Investigación de Mercado, SEO y Propuesta de Diseño (Fases 1 y 2)</td><td className="align-right"><span data-placeholder="monto-f1f2">$[Monto F1-F2]</span></td></tr>
              <tr><td>Desarrollo, Maquetación y Programación Front-End (Fase 3)</td><td className="align-right"><span data-placeholder="monto-dev">$[Monto Desarrollo]</span></td></tr>
              <tr><td>Fase de Pruebas, QA, Conexión de Dominio y Lanzamiento (Fase 4)</td><td className="align-right"><span data-placeholder="monto-deploy">$[Monto Despliegue]</span></td></tr>
              <tr className="bold-row"><td>Total Presupuesto (Neto)</td><td className="align-right"><span data-placeholder="monto-total">$[Monto Total]</span></td></tr>
            </tbody>
          </table>
        </div>
        <div className="clause">
          <div className="clause-title">2.2. Calendario de Pagos</div>
          <div className="clause-text">
            El Cliente se compromete a abonar los honorarios del Diseñador conforme al siguiente plan de hitos financieros obligatorios:
            <ul>
              <li><strong>50% de Anticipo (<span data-placeholder="monto-anticipo">$[Monto Anticipo]</span>)</strong>: Requerido para reservar la disponibilidad del Diseñador e iniciar formalmente el proyecto.</li>
              <li><strong>25% al Aprobar Diseño (<span data-placeholder="monto-hito2">$[Monto Hito 2]</span>)</strong>: Facturado tras la aprobación formal de la Fase 2 y previo al inicio del desarrollo web.</li>
              <li><strong>25% a la Entrega Final (<span data-placeholder="monto-hito3">$[Monto Hito 3]</span>)</strong>: Pagadero tras la aprobación en la fase de pruebas, previo a la conexión del dominio final.</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="section">
        <h1>3. Términos y Condiciones Básicos</h1>
        {[
          { title: '3.1. Vigencia del Contrato', text: 'El presente contrato entra en vigor y resulta plenamente vinculante a partir de la fecha de su firma por ambas partes, manteniéndose vigente hasta la entrega definitiva de los servicios descritos o la rescisión formal del mismo conforme a los mecanismos previstos en este documento.' },
          { title: '3.2. Modificaciones al Alcance del Proyecto', text: 'El Diseñador documentará y notificará cualquier solicitud del Cliente que exceda el alcance inicial del proyecto. Las modificaciones menores solicitadas fuera del alcance acordado serán tarificadas a la tarifa de $75.00 por hora.' },
          { title: '3.3. Retrasos y Suspensión', text: 'Si el Cliente no entrega el material requerido o demora las aprobaciones por más de diez (10) días hábiles consecutivos, el proyecto podrá ser puesto en suspensión. En tal caso, el Diseñador aplicará un recargo fijo por suspensión de $50.00 USD por cada semana de retraso.' },
          { title: '3.4. Pruebas y Aceptación', text: 'El Diseñador notificará al Cliente cuando cada entregable esté listo para revisión. El Cliente dispondrá de un plazo de siete (7) días hábiles para revisar los entregables y notificar por escrito cualquier objeción o corrección necesaria.' },
          { title: '3.5. Derecho de Subsanación', text: 'Si el Cliente notifica desviaciones justificadas en los entregables dentro del plazo de aceptación, el Diseñador tendrá derecho a subsanar y corregir dicho entregable en un plazo comercial razonable sin que esto se considere un incumplimiento contractual.' },
          { title: '3.6. Promoción y Portafolio', text: 'El Cliente acepta que el Diseñador pueda incluir un enlace de atribución discreto en el pie de página del sitio web final, y utilizar capturas de pantalla y descripciones del sitio web para fines de portafolio profesional y redes sociales, una vez que el sitio sea lanzado oficialmente al público.' },
        ].map((c, i) => (
          <div key={i} className="clause">
            <div className="clause-title">{c.title}</div>
            <div className="clause-text">{c.text}</div>
          </div>
        ))}
      </div>

      <div className="section">
        <h1>4. Propiedad Intelectual y Confidencialidad</h1>
        {[
          { title: '4.1. Cesión de Derechos sobre el Trabajo Final', text: 'Sujeto al cumplimiento y al pago completo de todas las tarifas y facturas por parte del Cliente, el Diseñador cede de forma exclusiva y definitiva al Cliente todos los derechos de propiedad intelectual sobre los Trabajos Finales creados específicamente para este proyecto.' },
          { title: '4.2. Reserva de Obras Preliminares', text: 'El Diseñador retiene todos los derechos de propiedad intelectual, autoría y propiedad sobre las Obras Preliminares (bocetos no seleccionados, propuestas de diseño alternativas rechazadas y archivos de trabajo previos al diseño definitivo).' },
          { title: '4.3. Herramientas del Diseñador (Designer Tools)', text: 'Las partes reconocen que el Diseñador utiliza y desarrolla herramientas y metodologías de diseño y desarrollo preexistentes en su práctica profesional. El Diseñador retiene la propiedad intelectual exclusiva de las "Herramientas del Diseñador".' },
          { title: '4.4. Materiales de Terceros', text: 'El Cliente reconoce que el sitio web puede incorporar materiales de terceros (como tipografías web bajo licencia, imágenes de stock, componentes o plugins). El Cliente será el único responsable de adquirir cualquier tarifa de licencia necesaria.' },
          { title: '4.5. Garantía de Originalidad del Diseñador', text: 'El Diseñador garantiza que, a su leal saber y entender, todos los Trabajos Finales creados para el Cliente son originales y no infringen los derechos de propiedad intelectual de terceros.' },
          { title: '4.6. Acuerdo de Confidencialidad Cruzado', text: 'Ambas partes se obligan a mantener estricta reserva y confidencialidad sobre toda la información comercial, técnica, estratégica, contraseñas o modelos de negocio compartidos durante la ejecución del proyecto.' },
        ].map((c, i) => (
          <div key={i} className="clause">
            <div className="clause-title">{c.title}</div>
            <div className="clause-text">{c.text}</div>
          </div>
        ))}
      </div>

      <div className="section">
        <h1>5. Servicios Web e Interactivos</h1>
        {[
          { title: '5.1. Periodo de Garantía Técnica', text: 'Tras la entrega final del sitio web y el pago correspondiente, se inicia un Periodo de Garantía de treinta (30) días naturales. Durante este tiempo, el Diseñador corregirá de forma gratuita cualquier error de visualización o fallo técnico directamente derivado de su entrega.' },
          { title: '5.2. Mantenimiento y Soporte Post-Garantía', text: 'Una vez finalizado el periodo de garantía, el Cliente podrá contratar un plan de soporte y actualización técnica opcional. Si se pacta, el plan tendrá una duración mínima de doce (12) meses a razón de una tarifa fija mensual de $150.00 al mes.' },
          { title: '5.3. Compatibilidad de Navegadores', text: 'El Diseñador se compromete a que el sitio web funcione y se visualice de forma consistente en las últimas dos (2) versiones estables y oficiales de Google Chrome, Apple Safari, Mozilla Firefox y Microsoft Edge.' },
          { title: '5.4. Cumplimiento de Leyes y Accesibilidad', text: 'El Diseñador pondrá sus mejores esfuerzos comerciales para que el sitio cumpla con estándares de accesibilidad actuales. Sin embargo, el Cliente reconoce que él es el único responsable de asegurar el cumplimiento legal general del sitio web.' },
          { title: '5.5. Independencia Laboral', text: 'Las partes declaran expresamente que la relación jurídica que las une es exclusivamente de carácter civil y comercial, actuando el Diseñador como un contratista independiente. El presente acuerdo no genera relación laboral ni de dependencia de ningún tipo.' },
          { title: '5.6. Limitación de Responsabilidad y Ley Aplicable', text: 'El Diseñador provee sus servicios "tal cual". En ninguna circunstancia la responsabilidad del Diseñador excederá el monto total de los honorarios pagados por el Cliente bajo este acuerdo. Este Contrato se regirá conforme a las leyes de la República Dominicana.' },
        ].map((c, i) => (
          <div key={i} className="clause">
            <div className="clause-title">{c.title}</div>
            <div className="clause-text">{c.text}</div>
          </div>
        ))}
      </div>

      <div className="section">
        <h1>6. Aceptación y Firmas</h1>
        <div className="clause">
          <div className="clause-title">Rescisión y Terminación del Acuerdo:</div>
          <div className="clause-text">
            Cualquiera de las partes puede rescindir este contrato mediante notificación por escrito con al menos
            cinco (5) días laborables de anticipación. En caso de rescisión unilateral por parte del Cliente sin
            mediar incumplimiento por parte del Diseñador, el Cliente se compromete a abonar el 100% del costo
            de la fase del proyecto que se encuentre activa al momento de la notificación de rescisión.
          </div>
        </div>
        <div className="clause">
          <div className="clause-title">Aceptación de Términos:</div>
          <div className="clause-text">
            Al firmar a continuación, las Partes de mutuo acuerdo aceptan que han leído, entendido y se
            comprometen a cumplir los términos enumerados en este contrato de servicios independientes de diseño
            y desarrollo web.
          </div>
        </div>
        <div className="signature-section">
          {[
            { side: 'Cliente', placeholders: { fecha: 'firma-fecha-cliente', cedula: 'firma-cedula-cliente', nombre: 'firma-nombre-cliente', email: 'firma-email-cliente' }, defaultVals: { nombre: '[Nombre y Apellido Cliente]', email: '[correo@dominiodelcliente.com]' } },
            { side: 'Diseñador', placeholders: { fecha: 'firma-fecha-diseñador', cedula: 'firma-cedula-diseñador', nombre: 'firma-nombre-diseñador', email: 'firma-email-diseñador' }, defaultVals: { nombre: '[Tu Nombre y Apellido]', email: '[hola@tu-estudio.com]' } },
          ].map(({ side, placeholders, defaultVals }) => (
            <div key={side} className="signature-col">
              <div className="signature-line" />
              <div className="sig-row"><div className="sig-label">Firma</div></div>
              <div className="sig-row" style={{ marginTop: '10px' }}>
                <div className="sig-label">Fecha</div>
                <div className="sig-value"><span data-placeholder={placeholders.fecha}>[Día / Mes / Año]</span></div>
              </div>
              <div className="sig-row">
                <div className="sig-label">Cédula / RNC</div>
                <div className="sig-value"><span data-placeholder={placeholders.cedula}>[000-0000000-0]</span></div>
              </div>
              <div className="sig-name"><span data-placeholder={placeholders.nombre}>{defaultVals.nombre}</span></div>
              <div className="sig-email"><span data-placeholder={placeholders.email}>{defaultVals.email}</span></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
