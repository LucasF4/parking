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

    /*
    var numeros = /([0-9])/;
    var alfabeto = /([a-zA-Z])/;
    var chEspeciais = /([~,!,@,#,$,%,^,&,*,-,_,+,=,?,>,<])/;

    //Bloqueia continuidade do processo se as senhas não tiverem as exigências necessárias
     if(!senha.match(numeros) || !senha.match(alfabeto) || !senha.match(chEspeciais)){
        var erro = `Formato de Senha inválida.`
        req.flash('erroLogin', erro)
        res.redirect('/adm-master')
        return
    }
    */

    var formated = cnpj.toString().replaceAll('.', '').replace('/', '')
    var user = username.toString().replaceAll(' ', '').toLowerCase()
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
                                responsavel: resp['data']['nome'],
                                preco: '0.00',
                                acrescimo: '0.00',
                                timeacs: 0,
                                address: resp['data']['logradouro'] + ' ' + resp['data']['numero']
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
            res.redirect('/adm-master')
        }
    })
    .catch( err => {
        console.log(err)
        var erro = `Tente novamente dentro de 1 minuto`
        res.flash("erroLogin", erro)
        res.redirect('/adm-master')
    })


    
})

router.post('/renov', async (req, res) => {
    var { pag, username } = req.body
    var today = moment().format('YYYY-MM-DD')
    //var license = moment().add(pag, 'month').format('YYYY-MM-DD')

    var selectUsers = await knex("users").select().where({username: username})

    console.log(`Hoje: ${today} / Licensa: ${selectUsers[0]['license']}`)

    var license = moment(selectUsers[0]['license']).add(pag, 'month').format('YYYY-MM-DD')
    console.log(selectUsers[0]['license'])

    console.log(pag + ' ' + username)

    await knex("users").where({username: username}).update({
        pag: pag,
        license: license
    })
    .then( () => {
        console.log('Usuário renovado com sucesso!')
        res.redirect('/adm-master')
    })
    .catch(err => {
        console.log(err)
        console.log('Erro ao tentar renovar usuario.')
    })
    
})

module.exports = router