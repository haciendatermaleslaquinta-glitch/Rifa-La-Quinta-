# Rifa Hacienda Termales La Quinta

Aplicación Vue con Google Sheets como base privada, Apps Script como backend y Google Drive para comprobantes. El flujo usa un único número por operación, transferencia manual y validación administrativa posterior.

## Configuración inicial

1. Copia el archivo `apps-script/Code.gs` en el proyecto de Apps Script vinculado a la hoja.
2. Crea las pestañas `Configuración` y `Bilhetes`. El backend también acepta `Configurações` para mantener compatibilidad durante la migración.
3. En `Configuración`, usa dos columnas: `Campo` y `Valor`. Configura como mínimo:

| Campo | Valor inicial |
| --- | --- |
| Valor de la boleta | `50000` |
| Cantidad total de boletas | `300` |
| Ciudad | `Manizales` |
| Título | `RIFA HACIENDA TERMALES LA QUINTA` |
| Gateway de pago | `manual` |
| Titular del medio de pago | Configurar manualmente |
| Entidad o medio de pago | Configurar manualmente |
| Tipo de cuenta | Configurar manualmente, si aplica |
| Número de cuenta o llave | Configurar manualmente |
| Instrucciones adicionales de pago | Configurar manualmente |
| URL de imagen QR | Opcional |
| WhatsApp | Número internacional, sin `+`, espacios ni guiones |
| Mensaje de WhatsApp | Puede contener `[ticketNumbers]` |
| ID de la carpeta principal de comprobantes | Configurar manualmente |

4. En `Bilhetes`, crea estas columnas: `Boleta`, `Estado`, `Comprador`, `Celular`, `Comprobante`, `Fecha y hora`, `Vendedor`, `Validado por`, `Fecha de validación`, `Observaciones`.
5. Carga las boletas como texto de tres dígitos, desde `001` hasta `300`, con estado `🟢 DISPONIBLE`.

Los únicos estados soportados son `🟢 DISPONIBLE`, `🟡 PENDIENTE DE VALIDACIÓN` y `🔴 PAGADA`. Administración cambia manualmente de pendiente a pagada después de verificar el ingreso. La página refleja ese cambio al recargar.

## Instalación en Google Sheets y Apps Script

### 1. Preparar Google Sheets

La hoja debe tener exactamente estas pestañas:

- `Configuración`
- `Bilhetes`

Durante una migración se acepta también `Configurações` como nombre temporal de la primera pestaña. La pestaña `Bilhetes` debe conservar ese nombre porque el backend la busca directamente.

En `Configuración`, usa la columna A para el parámetro y la columna B para su valor. Las celdas utilizadas son `A1:B16`:

| Parámetro | Ubicación en Sheets | Ejemplo | Obligatorio |
| --- | --- | --- | --- |
| Valor de la boleta | `A2:B2` | `50000` | Sí |
| Cantidad total de boletas | `A3:B3` | `300` | Sí |
| Ciudad | `A4:B4` | `Manizales` | Sí |
| Título | `A5:B5` | `RIFA HACIENDA TERMALES LA QUINTA` | Sí |
| Gateway de pago | `A6:B6` | `manual` | Sí |
| Titular del medio de pago | `A7:B7` | `[COMPLETAR TITULAR]` | Sí |
| Entidad o medio de pago | `A8:B8` | `[COMPLETAR ENTIDAD]` | Sí |
| Tipo de cuenta | `A9:B9` | `[COMPLETAR TIPO DE CUENTA]` | Si aplica |
| Número de cuenta o llave | `A10:B10` | `[COMPLETAR NÚMERO O LLAVE]` | Sí |
| Instrucciones adicionales de pago | `A11:B11` | `Realice la transferencia por el valor indicado.` | Sí |
| URL de imagen QR | `A12:B12` | `[COMPLETAR URL QR]` | No |
| WhatsApp | `A13:B13` | `[COMPLETAR WHATSAPP]` | Sí |
| Mensaje de WhatsApp | `A14:B14` | `Hola, realicé el pago de la boleta número [ticketNumbers] de la Rifa Hacienda Termales La Quinta. Adjunto el comprobante de pago.` | No |
| ID de la carpeta principal de comprobantes | `A15:B15` | `[COMPLETAR ID DE CARPETA DRIVE]` | Sí |
| Descripción | `A16:B16` | `Rifa 2026` | No |

No reemplaces los marcadores por datos inventados. El número de WhatsApp debe ser internacional, sin `+`, espacios ni guiones. El gateway debe ser exactamente `manual`.

En `Bilhetes`, usa exactamente estos encabezados en la fila 1, en este orden:

`Boleta` | `Estado` | `Comprador` | `Celular` | `Comprobante` | `Fecha y hora` | `Vendedor` | `Validado por` | `Fecha de validación` | `Observaciones`

En las filas 2 a 301, registra las boletas como texto de tres dígitos (`001` a `300`) y usa inicialmente `🟢 DISPONIBLE` en la columna `Estado`. No uses `1`, `2` o `300` como formato visual.

### 2. Preparar Google Drive

1. En Google Drive, crea una carpeta principal llamada `RIFA LA QUINTA 2026`.
2. Copia el ID de la carpeta desde la URL de Drive.
3. Pega ese valor en `B15`, junto a `ID de la carpeta principal de comprobantes`.
4. No cambies el acceso a público. Las carpetas y archivos deben permanecer privados.

El backend creará automáticamente dentro de esa carpeta las subcarpetas `001` hasta `300` cuando se registre cada comprobante.

### 3. Copiar y autorizar Apps Script

1. Abre la hoja de cálculo y selecciona **Extensiones > Apps Script**.
2. Abre el archivo creado por defecto, elimina su contenido y copia íntegramente [apps-script/Code.gs](apps-script/Code.gs).
3. Guarda el proyecto.
4. Ejecuta una función desde el editor si Google solicita autorización y acepta acceso a Google Sheets, Google Drive y bloqueo mediante `LockService`.
5. El propietario debe ser quien tenga acceso de edición a la hoja y permiso para crear archivos en la carpeta principal de Drive.

### 4. Implementar la aplicación web

1. En Apps Script, selecciona **Implementar > Nueva implementación**.
2. Elige **Aplicación web**.
3. Configura **Ejecutar como** con la cuenta del propietario.
4. Configura el acceso para los usuarios que utilizarán la rifa.
5. Autoriza los permisos solicitados y completa la implementación.
6. Copia la URL que termina en `/exec`. Esa es la URL que debe usarse como `SCRIPT_GOOGLE_URL`.

No se debe desplegar producción como parte de este cambio. La URL debe configurarse primero en un entorno de prueba.

### 5. Generar el frontend

En la raíz del repositorio, configura la variable con la URL copiada:

```powershell
$env:SCRIPT_GOOGLE_URL = 'https://script.google.com/macros/s/[ID_DE_LA_IMPLEMENTACION]/exec'
npm install
npm run lint
npm run build
```

El resultado queda en `dist/`. No incluyas en Git el ID privado de la hoja, credenciales, tokens ni datos bancarios.

### 6. Ejecutar una prueba completa

1. Usa una boleta de prueba, por ejemplo `001`, con estado `🟢 DISPONIBLE`.
2. Abre el `dist/index.html` mediante el servidor que publique el build.
3. Selecciona únicamente la boleta `001`.
4. Verifica titular, entidad, tipo de cuenta, número o llave y valor de `50000`.
5. Realiza la transferencia real o controlada definida por Administración.
6. Adjunta un JPG, PNG o PDF válido de menos de 5 MB.
7. Completa nombre, celular y la casilla de confirmación.
8. Envía el formulario una sola vez y espera el mensaje **Procesando...**.
9. Comprueba que aparezca la confirmación de comprobante recibido y que `Bilhetes!B2` cambie a `🟡 PENDIENTE DE VALIDACIÓN`.
10. Comprueba que se cree `RIFA LA QUINTA 2026/001`, que el archivo permanezca privado y que su ID quede en la columna `Comprobante`.

Para aprobar la boleta, Administración revisa el ingreso y edita manualmente su estado a `🔴 PAGADA`, completa `Validado por` y `Fecha de validación`, y recarga la página para comprobar el cambio.

### 7. Revertir los datos de prueba

Antes de reutilizar una boleta de prueba, guarda el estado original. Después de la prueba, elimina la fila o limpia `Comprador`, `Celular`, `Comprobante`, `Fecha y hora`, `Vendedor`, `Validado por`, `Fecha de validación` y `Observaciones`; vuelve a poner la boleta como texto `001` y el estado `🟢 DISPONIBLE`. Elimina también el archivo de prueba y la subcarpeta únicamente si no contienen comprobantes reales. Revisa y limpia el registro correspondiente en `Incidencias` según la política de Administración.

## Apps Script

El flujo original del repositorio enviaba por `POST` el nombre, celular y uno o varios números; el backend asociado a la hoja no está versionado aquí, por lo que no fue posible inspeccionarlo directamente. El archivo `apps-script/Code.gs` implementa el nuevo contrato:

- `doGet` devuelve configuración y estados actuales.
- `doPost` recibe JSON con una boleta y el comprobante en base64.
- `LockService` serializa las solicitudes para el mismo libro.
- El estado se vuelve a consultar bajo bloqueo antes de guardar.
- El comprobante se valida por MIME, extensión y tamaño máximo de 5 MB.
- Se crea la carpeta `001` dentro de la carpeta principal si no existe.
- El archivo queda privado por defecto y se registra su ID en Sheets.
- Solo después de guardar Drive y Sheets se marca `🟡 PENDIENTE DE VALIDACIÓN`.
- Los intentos sobre boletas ocupadas se registran en `Incidencias`.

Despliega el script como aplicación web ejecutándose como el propietario y con acceso para los usuarios que utilizarán la rifa. Autoriza los servicios de Google Drive y Google Sheets cuando Apps Script lo solicite. No publiques el ID de la hoja, tokens ni datos bancarios en este repositorio.

## Frontend

Configura `SCRIPT_GOOGLE_URL` con la URL de la aplicación web y ejecuta:

```sh
npm install
npm run lint
npm run build
```

El flujo público valida nombre, celular, boleta, comprobante y confirmación. Acepta JPG, JPEG, PNG y PDF de hasta 5 MB, impide doble envío y muestra la boleta como pendiente, nunca como pagada automáticamente.

El código anterior de generación Pix permanece aislado en `src/pixBuilder.js` como referencia histórica, pero ya no se importa ni participa en el bundle. También se eliminó `faz-um-pix` de las dependencias. `src/componnets/payAction.js` y `src/componnets/pix.js` permanecen sin registrar como referencia histórica y no participan en el flujo público.

## Pruebas de aceptación

Se ejecutaron `npm run lint` y `npm run build` correctamente. No se pudo ejecutar una prueba real contra Drive, Sheets o concurrencia porque el Apps Script y la hoja privada no están presentes en el repositorio. Antes de producción deben probarse las 20 pruebas del requerimiento, especialmente dos envíos simultáneos para la misma boleta, fallos de Drive/Sheets y privacidad del archivo.

## Pruebas pendientes en el entorno real

- Registro de la boleta `001`.
- Registro de la boleta `300`.
- Carga de JPG.
- Carga de PDF.
- Rechazo de archivo superior a 5 MB.
- Creación automática de carpeta.
- Privacidad del comprobante.
- Registro en Sheets.
- Cambio a `🟡 PENDIENTE DE VALIDACIÓN`.
- Cambio administrativo a `🔴 PAGADA`.
- Reflejo del estado en la página.
- Dos solicitudes simultáneas sobre la misma boleta.
- Funcionamiento desde celular.
- Mensaje de WhatsApp.
