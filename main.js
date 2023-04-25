const express = require('express');
const app = express();
const path = require('path');
const bodyParser = require('body-parser');
require('dotenv').config();

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
  res.sendFile(path.join(__dirname, "public", "IniciosecionUser.html"));
})
