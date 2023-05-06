const express = require('express');
const app = express();
const path = require('path');
const bodyParser = require('body-parser');
require('dotenv').config();
const multer = require('multer');
const crypto = require('crypto');
const fs = require('fs');

//para el uso de EJS
app.set('view engine', 'ejs');
//varibles twilio
const verifySid = "VAa880bf93dacfdadb85f2dcd4b3ce2549";
const client = require('twilio')(process.TWILIO_ACCOUNT_SID, process.TWILIO_AUTH_TOKEN);


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

//usando el Api de Twilio
app.post("/enviar-sms", (req, res) => {

  client.verify.v2
    .services(verifySid)
    .verifications.create({ to: "+50247013483", channel: "sms" })
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

  const verifyOTP = () => {
    client.verify.v2
      .services(verifySid)
      .verificationChecks.create({ to: "+50247013483", code: otpCode })
      .then((vc) => {
        verification_check = vc;
        console.log(otpCode);
        console.log(verification_check.status);
        if (verification_check.status == "approved") {
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


app.get("/secionIniciada", (req, res) =>{
  const inicio ={
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

app.post('/ruta1', (req, res) =>{
  const rutauser ={
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
      inicioSecion : false,
      ruta: 1,
      subirArchivo: true,
      ErrorPDF: true
    },
    {
      inicioSecion : false,
      ruta: 1,
      subirArchivo: false,
    }
  ]
const firmar = true;
  guardarPDF(req, res, rutasUser, firmar);
  
})



//La segunda ruta es para la comparacion de Las dos Rutas
app.post('/ruta2', (req, res)=>{
  
  const rutauser= {
    inicioSecion: false,
    ruta: 2,
  }
  res.render("UserInterface", rutauser);
})
app.post('/verificar', upload.fields([{ name: 'pdf1', maxCount: 1 }, { name: 'pdf2', maxCount: 1 }]), (req, res) => {
  
  
  const firmar = false;
  guardarPDF(req, res, rutasUser, firmar);
  
});


//Funciones
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
  
  
      rutauser[1].NombrePDF = []; // Crear la propiedad subirArchivo como un array vacío
      rutauser[1].NombrePDF.push(pdf.name); // Agregar pdfinfo al array
      rutauser[1].HashPDF = []; 
      rutauser[1].HashPDF.push(crearHash(pdf)); // Agregar pdfinfo al arra
      console.log(rutauser[1]);
      res.render("UserInterface", rutauser[1]);
  
    } else {
      
      res.render("UserInterface", rutauser[0]);
    }
  }else{
    const pdf1 = req.files['pdf1'][0]; // el primer archivo PDF cargado
    const pdf2 = req.files['pdf2'][0]; // el segundo archivo PDF cargado
    if(!pdf1 || !pdf2 ){
      
    }
    
  }
}


//añadimos la funcion que proporcionara el hash
function crearHash(file){
  const hash = crypto.createHash('sha256');
  hash.update(file);
const hashValue = hash.digest('hex');
console.log(hashValue); // Imprime el hash en formato hexadecimal
return hashValue;
}

