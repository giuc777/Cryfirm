const express = require('express');
const app = express();
const path = require('path');
const bodyParser = require('body-parser');
require('dotenv').config();
const multer = require('multer');
const crypto = require('crypto');
const fs = require('fs');
const { render } = require('ejs');
const { send } = require('process');
const mysql = require('mysql2');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const session = require('express-session');


app.use(session({
  secret: process.env.SESSION, 
  resave: false,
  saveUninitialized: true
}));

//para el uso de EJS
app.set('view engine', 'ejs');
//varibles twilio
const verifySid = process.env.TWILIO_VERIFYSID;
const client = require('twilio')(process.TWILIO_ACCOUNT_SID, process.TWILIO_AUTH_TOKEN);

const dbHost = process.env.DB_HOST;
const dbUser = process.env.DB_USER;
const dbPassword = process.env.DB_PASSWORD;
const dbDatabase = process.env.DB_DATABASE;


const connection = mysql.createConnection({
  host: dbHost,
  user: dbUser,
  password: dbPassword,
  database: dbDatabase,
});

connection.connect((err) => {
  if (err) {
    console.error('Error al conectar a la base de datos:', err);
    return;
  }
  console.log('Conexión establecida correctamente');
});



// Configurar body-parser
app.use(bodyParser.urlencoded({ extended: false }));
//app.use(bodyParser.json());

app.use(express.static(path.join(__dirname, 'public')));


app.get('/', function(req, res) {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(3001, function() {
  console.log('La aplicación está escuchando en el puerto 3001.');
});

app.get("/Registrarse",(req, res)=>{
  const error = {
    ErrorBasedatos: false,
    ErrorNomUser: false,
    ErrorNumber: false
  }
  res.render("Registrate", error)
})



//usando el Api de Twilio
app.post("/enviar-sms", (req, res) => {
  // datos recuperados del formulario
  let nombre = req.body.nombre;
  let password = req.body.password;
  let number = req.body.number;

  const numberHash = crearHash(number);
  const passwordHash = crearHash(password)

  console.log(nombre);
  console.log(password);
  console.log(number);

  // datos para usar en otra funcion de manejo de ruta
  req.session.nombre = nombre;
  req.session.password = passwordHash;
  req.session.number = number;
  const sql = `SELECT * FROM USERS WHERE TELEFONO = '${numberHash}'`;
  connection.query(sql, (err, results) => {
    if (err) {
      console.error('Error al realizar la consulta:', err);
      const error = {
        ErrorBasedatos: true,
        ErrorNomUser: false,
        ErrorNumber: false
      };
      res.render("Registrate", error);
      return;
    }
    if (results.length !== 0) {
      const error = {
        ErrorBasedatos: false,
        ErrorNomUser: false,
        ErrorNumber: true
      };
      res.render("Registrate", error);
      return;
    } 
    
  });
  const sqlnombre = `SELECT * FROM USERS WHERE NIKNAME = '${nombre}'`;
  connection.query(sqlnombre, (err, results) => {
    if (err) {
      console.error('Error al realizar la consulta:', err);
      const error = {
        ErrorBasedatos: true,
        ErrorNomUser: false,
        ErrorNumber: false
      };
      res.render("Registrate", error);
      return;
    }
    if (results.length !== 0) {
      const error = {
        ErrorBasedatos: false,
        ErrorNomUser: true,
        ErrorNumber: false
      };
      res.render("Registrate", error);
      return;
    }
  
  });

  client.verify.v2
      .services(verifySid)
      .verifications.create({ to: "+502" + number, channel: "sms" })
      .then((verification) => {
        console.log(verification.status);
        res.redirect("/verificar");
      })
      .catch((error) => {
        console.log(error);
        res.send("Hubo un error al enviar el SMS");
      });
});

app.get("/verificar", (req, res) => {

  let datos = {
    EnvForm: true,
    respuestaservidor: false
  };
  res.render("confirm", datos)
});

app.post("/verificar", (req, res) => {
  const otpCode = req.body.otpCode;
  let numFailedAttempts = 0; // variable para contar los intentos fallidos
  const nombre = req.session.nombre; //datos
  const password = req.session.password;
  const number = req.session.number
  

  const verifyOTP = () => {
    client.verify.v2
      .services(verifySid)
      .verificationChecks.create({ to: "+502"+number, code: otpCode })
      .then((vc) => {
        verification_check = vc;
        console.log(otpCode);
        console.log(verification_check.status);
        if (verification_check.status == "approved") {
          const sql = `INSERT INTO USERS (TELEFONO, NIKNAME, PASWORD) VALUES ('${number}', '${nombre}', '${password}')`;
          connection.query(sql, (err, result) => {
            if (err) {
              console.error('Error al ejecutar la consulta:', err);
              return;
            }
        
            console.log('Datos insertados correctamente');
          });
          
          return res.redirect("/secionIniciada");
        } else {
          numFailedAttempts++;
          if (numFailedAttempts == 3) {
            let datos1 = {
              EnvForm: true,
              respuestaservidor: true
            };
            res.render("confirm", datos1);
          } else {
            verifyOTP(); // llamamos de nuevo a la función de verificación
          }
        }
      })
      .catch((error) => {
        console.log(error);
        let datos = {
          EnvForm: false,
          respuestaservidor: false
        };
        res.render("confirm", datos);
      });
  };

  verifyOTP(); // llamamos la función de verificación por primera vez
});


app.get("/secion",(req, res)=>{
  const error = {
    respuestaservidor: false
  }
  res.render("IniciarSecion", error)
})

app.post("/VerificarUser",(req, res)=>{
  const nombre = req.body.nombre_secion;
  const dato1 = req.body.password_secion;
  const password = crearHash(dato1);

  req.session.nombre = nombre;

  

  const sql = `SELECT * FROM USERS WHERE NIKNAME = '${nombre}'`;
  connection.query(sql, (err, results) => {
    if (err) {
      console.error('Error al realizar la consulta:', err);
      const error = {
        respuestaservidor: true
      }
      res.render("IniciarSecion", error)
    }
    if(results.length === 0){
      const error = {
        respuestaservidor: true
      }
      res.render("IniciarSecion", error);
    }
  
console.log(results)

    if(results[0].PASWORD == password){
      res.redirect("/secionIniciada")
    }else{
      const error = {
        respuestaservidor: true
      }
      res.render("IniciarSecion", error);
    }
  });
})



app.get("/secionIniciada", (req, res) =>{
  const inicio ={
    User: req.session.nombre,
    inicioSecion : true,
    ruta: 0,
  }
  res.render("UserInterface", inicio);
})

//Dentro de la interfaz del usuario


//cargar PDF
const upload = multer({
  dest: 'uploads/' // La carpeta donde se guardarán los archivos subidos
});


//la carpeta donde se guada el PDF firmado
const outputPath = path.join(__dirname, 'PDFfirmado', 'nuevo_archivo.pdf');


app.post('/ruta1', (req, res) =>{
  const rutauser ={
    User: req.session.nombre,
    inicioSecion : false,
    ruta: 1,
    subirArchivo: true,
    ErrorPDF: false,
  }
  res.render("UserInterface", rutauser);
});

//Creamos lo necesario para firmar el documento
app.post('/ruta1', (req, res) =>{
  const rutauser ={
    User: req.session.nombre,
    inicioSecion : false,
    ruta: 1,
    subirArchivo: true,
    ErrorPDF: false,
  }
  res.render("UserInterface", rutauser);
});

//Creamos la logica para la firma
app.post('/firmar',upload.single('pdf'), (req, res)=>{
  
  //Son los datos para que renderize correctamente
  const rutasUser =[
    {
      User: req.session.nombre,
      inicioSecion : false,
      ruta: 1,
      subirArchivo: true,
      ErrorPDF: true
    },
    {
      User: req.session.nombre,
      inicioSecion : false,
      ruta: 1,
      subirArchivo: false,
    }
  ]
const firmar = true;
  guardarPDF(req, res, rutasUser, firmar);
  
})

app.post('/descargar', (req, res)=>{
  const file = './PDFfirmado/nuevo_archivo.pdf';
  res.download(file, 'DocFimado.pdf', (err) => {
    if (err) {
      console.error(`Error al descargar el archivo: ${err}`);
      res.status(404).send('Archivo no encontrado');
    }
  });
});



//La segunda ruta es para la comparacion de firmas
app.post('/ruta2', (req, res)=>{
  
  const rutauser= {
    User: req.session.nombre,
    inicioSecion: false,
    ruta: 2,
    subirArchivo: true,
    ErrorPDF: false
  }
  res.render("UserInterface", rutauser);
})
app.post('/verificar', upload.fields([{ name: 'pdf1', maxCount: 1 }, { name: 'pdf2', maxCount: 1 }]), (req, res) => {
  const rutasUser =[
    {
      User: req.session.nombre,
      inicioSecion : false,
      ruta: 2,
      ErrorPDF: true
    },
    {
      User: req.session.nombre,
      inicioSecion : false,
      ruta: 1,
      subirArchivo: false,
    }
  ]
  
  const firmar = false;
  guardarPDF(req, res, rutasUser, firmar);
  
});


//generamos la funcion que guardara el PDF
function guardarPDF(req, res, rutauser, firmar) {
  if(firmar){
    const file = req.file;

    if (!file) {
    
      return res.render("UserInterface", rutauser[0]);
    }
    const extension = path.extname(file.originalname);
  
    if (extension === '.pdf') {
     
    
      const pdfPath = path.resolve(file.path);
      const pdf = fs.readFileSync(pdfPath);

      const uint8Array = new Uint8Array(pdf)
      console.log(uint8Array)
      hashDelPDF = crearHash(pdf)
  
  
      rutauser[1].NombrePDF = []; // Crear la propiedad subirArchivo como un array vacío
      rutauser[1].NombrePDF.push(pdf.name); // Agregar pdfinfo al array
      rutauser[1].HashPDF = []; 
      rutauser[1].HashPDF.push(hashDelPDF); 
      crearDescarga(uint8Array, hashDelPDF);


      
      res.render("UserInterface", rutauser[1]);



  
    } else {
      
      res.render("UserInterface", rutauser[0]);
    }
  }else{
    

    const Pdf1 = req.files['pdf1'][0]; // el primer archivo PDF cargado
    const Pdf2 = req.files['pdf2'][0]; // el segundo archivo PDF cargado

    

    if(!Pdf1 || !Pdf2 ){
      return res.render("UserInterface", rutauser[0]);

    }


    
    const files = [Pdf1, Pdf2] 
    const file = [fs.readFileSync(Pdf1.path), fs.readFileSync(Pdf2.path)];
    //Comprueba que sean PDF
    files.forEach(element => {
      const extension = path.extname(element.originalname);
      if (extension != '.pdf'){
       res.render("UserInterface", rutauser[0]);
     }
    });

    console.log(file[0])
    console.log(file[1])
    
    console.log("vamos bien")
    let hash1 = crearHash(file[0]);
    console.log("seguimos bien")
    let hash2 = crearHash(file[1]);

    if(hash1 === hash2){
      res.redirect("/identicas");
    }else{
      res.redirect("/diferentes")
    }
    
  }
}


app.get("/identicas", (req, res)=>{
  const rutauser= {
    User: req.session.nombre,
    inicioSecion: false,
    ruta: 2,
    subirArchivo: false,
    Correcto: true
  }
  res.render("UserInterface", rutauser);
})

app.get("/diferentes", (req, res)=>{
  const rutauser= {
    User: req.session.nombre,
    inicioSecion: false,
    ruta: 2,
    subirArchivo: false,
    Correcto: false
  }
  res.render("UserInterface", rutauser);
})

//funcion para la preparación de descarga del PDF
async function crearDescarga(pdfBytes, hash){
  const pdfDoc = await PDFDocument.load(pdfBytes); // Cargar el PDF desde los bytes

  const page = pdfDoc.addPage();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const { width, height } = page.getSize();
  const currentDate = new Date();

  // Obtener la fecha en formato ISO 8601 (YYYY-MM-DD)
  const isoDateString = currentDate.toISOString().split('T')[0];

  const paragraph1 = 'firma no. ' + hash;
  
  const fontSize = 12;
  const lineHeight = fontSize * 1.2;

  // Escribir el primer párrafo
  page.drawText(paragraph1, {
    x: 50,
    y: height - 50,
    size: fontSize,
    font: font,
  });



  const modifiedPdfBytes = await pdfDoc.save();
  fs.writeFileSync(outputPath, modifiedPdfBytes);
}


//añadimos la funcion que proporcionara el hash
function crearHash(file){
  const hash = crypto.createHash('sha256');
  hash.update(file);
const hashValue = hash.digest('hex');
console.log(hashValue); // Imprime el hash en formato hexadecimal
return hashValue;
}

