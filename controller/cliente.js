const express = require('express')
const router = express.Router()
const moment = require('moment')
const knex = require('../Database/connection')

router.get('/cliente', async (req, res) => {
    let parking = req.query['parking'];
    let placa = req.query['placa'];
    var error = req.flash('error')
    error = (error == undefined || error.length == 0) ? undefined : error

    if(placa == '' || placa == undefined){
        res.render('cliente/cliente', {placa: placa, error: error})
    }else{
        
        var info = await knex('users').where({username: parking})
        await knex.raw(`SELECT *, now()::time, AGE(a.entrada, now()) FROM ${parking} a WHERE placa = '${placa}'`)
        .then( async resp => {

            var select = await knex.raw(`SELECT CAST(entrada as date) as entry, * FROM ${parking} WHERE placa = '${placa}'`)
            var resp2 = await knex.raw(`SELECT *, now()::time, AGE(a.entrada, now()) FROM ${parking} a WHERE placa = '${placa}' AND  estadia is null`)

            if(resp2.rows[0] == undefined){
                var resp2 = await knex.raw(`SELECT *, now()::time, AGE(a.entrada, now()) FROM ${parking} a WHERE placa = '${placa}'`)
            }

            console.log(select.rows)
            console.log( resp2.rows)
            console.log( resp.rows )
            var diff = moment(resp2.rows[0]['entrada'], 'HH:mm:ss').diff(moment(resp2.rows[0]['now'], 'HH:mm:ss'))
            var dias = moment.duration(diff)
            
            var tempo = (parseInt(dias['_data']['hours'].toString().replace('-', '')) <= 9 ? '0' + parseInt(dias['_data']['hours'].toString().replace('-', '')) : parseInt(dias['_data']['hours'].toString().replace('-', ''))) + ':' +(parseInt(dias['_data']['minutes'].toString().replace('-', '')) <= 9 ? '0' + parseInt(dias['_data']['minutes'].toString().replace('-', '')) : parseInt(dias['_data']['minutes'].toString().replace('-', ''))) + ':' + (parseInt(dias['_data']['seconds'].toString().replace('-', '')) <= 9 ? '0' + parseInt(dias['_data']['seconds'].toString().replace('-', '')) : parseInt(dias['_data']['seconds'].toString().replace('-', '')))
            console.log(tempo)

            console.log(`Preço da tabela: ${info[0]['preco']}`)
            console.log('Time is: ' + info[0]['timeacs'])
            if(parseInt(dias['_data']['hours'].toString().replace('-', '')) == 0 && parseInt(dias['_data']['minutes'].toString().replace('-', '')) < 3 && parseInt(dias['_data']['days'].toString().replace('-', '')) == 0){
                preco = 0.00.toFixed(2)
                console.log('------------ esta')
            }else
            if(parseInt(dias['_data']['hours'].toString().replace('-', '')) == 0 && parseInt(dias['_data']['minutes'].toString().replace('-', '')) < 30 && parseInt(dias['_data']['days'].toString().replace('-', '')) == 0){
                preco = info[0]['preco'];
                console.log('Preço é de ' + preco)
            }else if(parseInt(dias['_data']['hours'].toString().replace('-', '')) == 0 && parseInt(dias['_data']['minutes'].toString().replace('-', '')) >= 30 && parseInt(dias['_data']['days'].toString().replace('-', '')) == 0){
                preco = (parseFloat(info[0]['preco']) + parseFloat(info[0]['preco'])).toFixed(2)
                console.log('Preço é de ' + preco)
            }else{
                var i = 0;
                var k = 0;
                var j = 0;
                preco = (parseFloat(info[0]['preco']) + parseFloat(info[0]['preco']) + parseFloat(info[0]['acrescimo']) ).toFixed(2);

                do{
                    i++
                    if((i % info[0]['timeacs'] === 0) && k > 0){
                        preco = (parseFloat(preco) + parseFloat(info[0]['acrescimo'])).toFixed(2);
                    }
                    if(i == 60){
                        i = 0;
                        k++
                    }
                    if(k == 24){
                        k = 0;
                        j++
                    }

                }while(i < parseInt(dias['_data']['minutes'].toString().replace('-', '')) || k < parseInt(dias['_data']['hours'].toString().replace('-', '')) || j < parseInt(dias['_data']['days'].toString().replace('-', '')))
                //|| j < parseInt(dias['_data']['days'].toString().replace('-', ''))
                console.log(j + ':' + k + ':' + i)
                //console.log('-----------> ' + j)
                console.log('Preço total: ' + preco)
                //console.log(parseInt(dias['_data']['days'].toString()))
            }

            res.render('cliente/cliente', {placa: placa, select: select.rows, user: parking, valor: preco.replace('.', ','), error: error})
        })
        .catch(() => {
            var error = `Veículo não encontrado.`;
            req.flash("error", error)
            res.redirect('/cliente?parking='+parking)
        })
        
    }
})


module.exports = router