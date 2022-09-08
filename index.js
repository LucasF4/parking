require('dotenv').config()

const express = require("express")
const path = require("path")
const app = express()
const knex = require('./Database/connection')
const bodyParser = require('body-parser')
const register = require('./controller/controll')
const PORT = process.env.PORT || 7575
const auth = require('./middleware/auth.js')

const session = require('express-session')
const flash = require("express-flash")

//app.use(flash())

app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 3600000 }
}))
app.use(flash())

app.set('views', path.join(__dirname + '/views'))
app.set('view engine', 'ejs')

app.use(bodyParser.urlencoded())
app.use(bodyParser.json())

app.use('/', register)

app.get('/login', (req, res) => {
    var erro = req.flash("erroLogin")
    erro = (erro == undefined || erro.length == 0) ? undefined : erro
    res.render('login', {erro: erro})
})

app.get('/', auth, async (req, res) => {
    /* var error = req.flash("errorRegister")
    error = ( error == undefined || error.length == 0) ? undefined : error */
    var success = req.flash('success')
    var erro = req.flash('erroLogin')
    success = (success == undefined || success.length == 0) ? undefined : success
    erro = (erro == undefined || erro.length == 0) ? undefined : erro
    var select = await knex('veicles').select().whereNull("saida")
    console.log(req.session)
    res.render('init', {vec: select, success: success, erro: erro})
})

app.listen(PORT, () => {
    console.log("---> Servidor Iniciado! <---\nRodando na Porta: " + PORT)
})