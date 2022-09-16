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

app.use(express.static('public'))
app.use('/src', express.static(__dirname + 'public/src'))
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

app.get('/home', (req, res) => {
    res.render('home')
})

app.get('/', auth, async (req, res) => {
    var db = req.session.user
    /* var error = req.flash("errorRegister")
    error = ( error == undefined || error.length == 0) ? undefined : error */
    var success = req.flash('success')
    var erro = req.flash('erroLogin')
    var expire = req.flash('expire')
    expire = (expire == undefined || expire.length == 0) ? undefined : expire
    success = (success == undefined || success.length == 0) ? undefined : success
    erro = (erro == undefined || erro.length == 0) ? undefined : erro
    await knex(db).select().whereNull("saida").then(select => {
        console.log(req.session)
        res.render('init', {vec: select, success: success, erro: erro, expire: expire})
    })
    .catch(() => {
        var erro = `Algo deu errado, entre em contato com o desenvolvedor! Erro: 1002`
        req.flash('erroLogin', erro)
        res.redirect('/login')
    })
})

app.listen(PORT, () => {
    console.log("---> Servidor Iniciado! <---\nRodando na Porta: " + PORT)
})