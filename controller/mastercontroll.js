const express = require('express')
const router = express.Router()
const knex = require('../Database/connection')
const auth = require('../middleware/adm')
const validator = require('validator')
const bcrypt = require('bcrypt')
const moment = require('moment')
const axios = require('axios')

router.get('/adm-master', auth, async (req, res) => {
    const today = moment().format('YYYY-MM-DD')
    await knex.raw(`SELECT username, email, phone, pag, license, cnpj FROM users WHERE username != '${process.env.MM}'`)
    .then(result => {
        //console.log(result.rows)
        var erro = req.flash("erroLogin")
        var success = req.flash("success")
        success = (success == undefined || success.length == 0) ? undefined : success
        erro = (erro == undefined || erro.length == 0) ? undefined : erro
        res.render('master/adm-master',{result: result.rows, success: success, erro: erro, today: today})
    })
    .catch(err => {
        console.log(err)
        res.redirect('/')
    })
})

router.post('/del', auth, async (req, res) => {
    var { username, email } = req.body
    //console.log(username + ' ' + email)
    await knex.raw(`DELETE FROM users WHERE username = '${username}' and email = '${email}'`)
    .then((result) => {
        knex.raw(`DROP TABLE ${username}`).then(() => {
            console.log('Deletado com sucesso')
            res.json(result)
        })
        .catch(err => {
            console.log(err)
            res.redirect('/adm-master')
        })
    })
})

router.post('/cad', auth, async (req, res) => {
    var { username, email, senha, phone, pag, cnpj } = req.body
    //console.log(`username: ${username} / email: ${email} / senha: ${senha} / phone: ${phone} / pag: ${pag} / cnpj: ${cnpj}`)

    var formated = cnpj.replaceAll('.', '').replace('/', '')
    var user = username.replaceAll(' ', '').toLowerCase()
    axios.get(`https://www.receitaws.com.br/v1/cnpj/${formated}`)
    .then(async resp => {
        if(resp['data']['situacao'] == 'ATIVA'){
            var today = moment().format('YYYY-MM-DD')
            var license = moment().add(pag, 'month').format('YYYY-MM-DD')

            let number = phone.replace('(', '').replace(')', '').replace('-', '').replace(' ', '')

            await knex('users').select().where({email: email}).orWhere({username: user}).orWhere({phone: phone})
            .then(exist => {
                if(exist[0] == undefined){
                    if(validator.isEmail(email)){
                        if(validator.isMobilePhone(phone, 'pt-BR', true)){
                            var salt = bcrypt.genSaltSync(10)
                            var hash = bcrypt.hashSync(senha, salt)

                            knex('users').insert({
                                username: user,
                                email: email,
                                senha: hash,
                                phone: number,
                                meta: 0.00,
                                pag: pag,
                                created: today,
                                license: license,
                                cnpj: cnpj,
                                responsavel: resp['data']['nome']
                            }).then(() => {
                                knex.raw(`
                                CREATE TABLE ${user} (
                                    id serial not null primary key,
                                    placa  varchar (10),
                                    entrada timestamp without time zone,
                                    saida varchar (100),
                                    estadia varchar (100),
                                    preco numeric,
                                    desconto numeric,
                                    descricao varchar (255),
                                    formpag varchar (30)
                                )
                                `)
                                .then(() => {
                                    var success = `Usário criado com sucesso!`
                                    req.flash("success", success)
                                    res.redirect('/adm-master')
                                })
                                .catch(erro => {
                                    var erro = `Ocorreu um erro. Banco existente!`
                                    console.log('Erro: 1000 ' + erro)
                                    req.flash("erroLogin", erro)
                                    res.redirect('/adm-master')
                                })
                            })
                        }else{
                            var erro = `Número Inválido`
                            req.flash("erroLogin", erro)
                            res.redirect('/adm-master')
                        }
                    }
                }else{
                    var erro = `Usuário com esses dados já existentes`
                    req.flash('erroLogin', erro)
                    res.redirect('/adm-master')
                }
            })
            .catch(err => {
                console.log(err)
                res.redirect('/adm-master')
            })
        }else{
            var erro = `O CNPJ informado contém restrinções.`
            req.flash('erroLogin', erro)
            res.redirect('adm-master')
        }
    })
    .catch( err => {
        console.log(err)
        var erro = `Tente novamente dentro de 1 minuto`
        res.flash("erroLogin", erro)
        res.redirect('/adm-master')
    })


    
})

router.post('/renov', (req, res) => {
    var { pag } = req.body
    var license = moment().add(pag, 'month').format('YYYY-MM-DD')

    console.log(pag + ' ' + license)
})

module.exports = router