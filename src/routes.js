const express = require("express");
const router = express.Router();
var bodyParser = require("body-parser");
var colors = require("colors");
const { check, validationResult } = require("express-validator");
const bcryptjs = require("bcryptjs");
const {connection,} = require("./database/connection");
const passport = require("passport");
const session = require("express-session");

router.use(
  session({
    secret: "secret",
    resave: true,
    saveUninitialized: true,
  })
);



router.get("/", async (req, res) => {
  if (req.session.loggedin) {
    await connection.query(
      "SELECT notas.*, usuarios.username AS idUsuario FROM notas INNER JOIN usuarios ON notas.usuario = usuarios.id WHERE notas.usuario = ?",
      req.session.userId,
      (err, results) => {
        req.session.notas = results;
        res.render("index", {
          username: req.session.username,
          userId: req.session.userId,
          notas: req.session.notas,
        });
      }
    );
  } else {
    res.redirect("/login");
  }
});

router.get("/login", (req, res) => {
  res.render("login.ejs");
});

router.get("/register", (req, res) => {
  res.render("register.ejs");
});

router.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

router.get("/editar/:id", (req, res) => {
  const id = req.params.id;
  connection.query(
    "SELECT * FROM notas WHERE id = ?",
    [id],
    (errors, result) => {
      if (errors) {
        console.log(colors.red("Error en consulta get editar/id"));
        throw errors;
      }

      let resultado = result[0];

      res.render("index.ejs", {
        editar: true,
        id: id, 
        username: req.session.username,
        titulo: resultado.titulo,
        descripcion: resultado.descripcion,
        prioridad: resultado.prioridad,
        notas: req.session.notas,
      });

    }
  );
});

router.get('/eliminar/:id', (req, res)=> {
  id = req.params.id;
  connection.query("DELETE FROM notas WHERE ID = "+id, (error, resultado)=>{
    if(error){
      console.log("Error eliminando nota de la base de datos".red);
      return;
    }
    console.log("Nota eliminada correctamente");
    res.redirect('/');
  });
});

router.post('/editar/:id', (req, res) => {
  let id = req.params.id;
  let titulo = req.body.nuevoTitulo;
  let descripcion = req.body.nuevaDescripcion;
  let prioridad = req.body.prioridad == "on" ? 1 : 0;
  const arr = [id, titulo, descripcion, prioridad]; 
  console.log("Nuevos datos de ingreso: "+arr);

  connection.query('UPDATE notas SET ? WHERE id=?',[{titulo, descripcion, prioridad}, id], (errors, result) =>{
    if(errors){
      console.log(colors.red("Error actualizando la nota"));
    }
    console.log("Nota actualizada correctamente");
    res.redirect('/');
  });

})

router.post("/auth", (req, res) => {
  let userName = req.body.username;
  let password = req.body.password;

  if (userName && password) {
    connection.query(
      "SELECT * FROM usuarios WHERE username = '" + userName + "'",
      async (err, results) => {
        if (results.length == 0) {
          console.log("No se ha encontrado usuario con ese username");
          res.render("login.ejs", {
            error: true,
            msg: "No se ha encontrado un usuario con ese Username",
            username: userName,
          });
          return;
        }
        if (await bcryptjs.compare(password, results[0].password)) {
          req.session.userId = results[0].id;
          req.session.loggedin = true;
          req.session.username = results[0].username;
          res.redirect("/");
        } else {
          console.log("Contraseñas NO son iguales");
          res.render("login.ejs", {
            error: true,
            msg: "Error, contraseña incorrecta",
            username: userName,
          });
        }
      }
    );
  } else {
    res.render("login.ejs", {
      error: true,
      msg: "Debe ingresar nombre de usuario y contraseña para continuar",
      username: "",
    });
  }
});

router.post(
  "/",
  [
    check("titulo", "Hace falta titulo").isLength({ min: 1 }),
    check("descripcion", "Hace falta descripcion").isLength({ min: 1 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      console.log("Hay errores!");
      console.log(colors.inverse(req.session.username));
      res.render("index", {
        errores: errors.array(),
        username: req.session.username,
        userId: req.session.userId,
        notas: req.session.notas,
      });
      return;
    }

    let titulo = req.body.titulo;
    let descripcion = req.body.descripcion;
    let prioridad = req.body.prioridad == "on" ? 1 : 0;
    let usuario = req.session.userId;
    await connection.query(
      "INSERT INTO notas SET ?",
      {
        titulo: titulo,
        descripcion: descripcion,
        prioridad: prioridad,
        usuario: usuario,
      },
      (err, results) => {
        if (err) {
          console.log("Error agregando nota a la base de datos");
          throw err;
        } else {
          console.log("Nota agregada con exito!");
          res.redirect("/");
        }
      }
    );
  }
);

router.post(
  "/register",
  [
    // Check validity
    check("username").custom((value) => {
      return new Promise((resolve, reject) => {
        connection.query(
          "SELECT id FROM usuarios WHERE username=?",
          [value],
          function (err, results, fields) {
            if (err) reject(err);
            if (results.length > 0) {
              reject(
                new Error("Ya existe una cuenta con ese nombre de usuario")
              );
            } else {
            }
            resolve();
          }
        );
      });
    }),
    check("password", "invalid password").custom(
      (value, { req, loc, path }) => {
        if (value !== req.body.confirmPassword) {
          // trow error if passwords do not match
          throw new Error("Passwords don't match");
        } else {
          return value;
        }
      }
    ),
  ],
  async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.render("register.ejs", {
        errores: errors.array(),
        valores: req.body,
      });
      console.log(errors);
      return;
    }

    let userName = req.body.username;
    let password = req.body.password;
    let passCrypt = await bcryptjs.hash(password, 8);

    connection.query(
      "INSERT INTO usuarios SET ?",
      { username: userName, password: passCrypt },
      async (error, results) => {
        if (error) {
          console.log("Error insertando nuevo usuario");
        } else {
          console.log("Usuario agregado de forma satisfactoria".green);
          res.redirect("/login");
        }
      }
    );
  }
);

module.exports = router;
