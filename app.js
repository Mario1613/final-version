const express = require('express');
const qrcode = require('qrcode');
const admin = require('firebase-admin');
const ejs = require('ejs');

const serviceAccount = require('./firebase-credentials.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: 'fir-firestore-a9898.appspot.com',
  });

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');
const db = admin.firestore();

// Inicio de la aplicación (root)
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

app.get('/registro-alumno', (req, res) => {
  res.render('form-alumno');
});

app.get('/registro-asesor', async (req, res) => {
  res.render('form-asesor');
});

app.get('/registro-completo/alumno/:id', (req, res) => {
  const alumnoId = req.params.id;
  res.render('descarga-alumno', {alumnoId: alumnoId});
});

app.get('/registro-completo/asesor/:id', async (req, res) => {
  const asesorId = req.params.id;
  res.render('descarga-asesor', {asesorId: asesorId});
});

app.get('/generarQr/alumno/:id', async (req, res) => {
  //Código para generar el codigo QR
  const textToEncode = req.params.id
  const qrCodeDataUrl = await qrcode.toDataURL("http://localhost:3000/credencial/alumno/"+textToEncode);
  const storageBucket = admin.storage().bucket();
  const fileName = `qr-codes/alumnos/${textToEncode}.png`;
  const file = storageBucket.file(fileName);
  await file.save(Buffer.from(qrCodeDataUrl.split(',')[1], 'base64'));
  const fileUrl = `https://storage.googleapis.com/${storageBucket.name}/${fileName}`;

  res.set('Content-Disposition', `attachment; filename="${textToEncode}.png"`);
  res.set('Content-Type', 'image/png');
  const downloadStream = file.createReadStream(); 
  downloadStream.pipe(res);
});

app.get('/generarQr/asesor/:id', async (req, res) => {
  const textToEncode = req.params.id
  const qrCodeDataUrl = await qrcode.toDataURL("http://localhost:3000/credencial/asesor/"+textToEncode);
  const storageBucket = admin.storage().bucket();
  const fileName = `qr-codes/asesores/${textToEncode}.png`;
  const file = storageBucket.file(fileName);
  await file.save(Buffer.from(qrCodeDataUrl.split(',')[1], 'base64'));
  const fileUrl = `https://storage.googleapis.com/${storageBucket.name}/${fileName}`;

  res.set('Content-Disposition', `attachment; filename="${textToEncode}.png"`);
  res.set('Content-Type', 'image/png');
  const downloadStream = file.createReadStream(); 
  downloadStream.pipe(res);
});

app.get('/credencial/alumno/:id', async (req, res) => {
  //UNA VEZ DESCARGADO Y ESCANEADO EL QR SE CONTINUA A PARTIR DE AQUÍ
  //Recuperamos nuevamente el Id del documento que está en el QR
  const alumnoId = req.params.id;
  //Llamamos a la base de datos para recuperar la informacion del registro por medio del ID
  const userRef = db.collection("alumnos").doc(alumnoId);
  const datos = await userRef.get()
  console.log(datos.data());

  //Una vez descargado yescaneado el QR continuamos
  //Los enviamos al template con EJS
  res.render('credencial-alumno', {
    nombre: datos.data().nombre,
    primerApellido: datos.data().primerApellido,
    segundoApellido: datos.data().segundoApellido,
    claveAsesor: datos.data().claveAsesor,
    nivel: datos.data().nivel,
    areaComponente: datos.data().areaComponente
  });
});

app.get('/credencial/asesor/:id', async (req, res) => {
  //UNA VEZ DESCARGADO Y ESCANEADO EL QR SE CONTINUA A PARTIR DE AQUÍ
  //Recuperamos nuevamente el Id del documento que está en el QR
  const asesorId = req.params.id;
  //Llamamos a la base de datos para recuperar la informacion del registro por medio del ID
  const userRef = db.collection("asesores").doc(asesorId);
  const datos = await userRef.get()
  console.log(datos.data());

  //Una vez descargado yescaneado el QR continuamos
  //Los enviamos al template con EJS
  res.render('credencial-asesor', {
    asesorId: asesorId,
    nombre: datos.data().nombre,
    primerApellido: datos.data().primerApellido,
    segundoApellido: datos.data().segundoApellido,
    areaComponente: datos.data().areaComponente
  });
});

app.post('/registrar-alumno', async (req, res) => {
  // CREAR REGISTRO
  const dataAlumno = {
    curp: req.body.curp,
    estado: req.body.estado,
    nombre: req.body.nombre,
    primerApellido: req.body.primerApellido,
    segundoApellido: req.body.segundoApellido,
    correo: req.body.correo,
    telefono: req.body.telefono,
    claveAsesor: req.body.claveAsesor,
    maestroTutor: req.body.maestroTutor,
    nivel: req.body.nivel,
    areaComponente: req.body.areaComponente,
  };

//Recupera el ID del usuario
  const docRef = db.collection('alumnos').doc();
  docRef.set(dataAlumno);
//Empareja la info recopilada con el id
  const docId = docRef.id;
  console.log("ID Alumno generado automaticamente: " + docId);

//Redireccionamos a la ruta de /success junto con el id del documento
  res.redirect('/registro-completo/alumno/'+docId);

});

app.post('/registrar-asesor', async (req, res) => {
    // CREAR REGISTRO
    const dataAsesor = {
      curp: req.body.curp,
      estado: req.body.estado,
      nombre: req.body.nombre,
      primerApellido: req.body.primerApellido,
      segundoApellido: req.body.segundoApellido,
      correo: req.body.correo,
      telefono: req.body.telefono,
      areaComponente: req.body.areaComponente,
    };

    
  
  //Recupera el ID del usuario
    const docRef = db.collection('asesores').doc();
    docRef.set(dataAsesor);
  //Empareja la info recopilada con el id
    const docId = docRef.id;
    console.log("ID Asesor generado automaticamente: " + docId);
  
  //Redireccionamos a la ruta de /success junto con el id del documento
    res.redirect('/registro-completo/asesor/'+docId);
});

// Escuchar en el puerto elegido

app.listen(3000, ()=> {
    console.log("Server is up");
});