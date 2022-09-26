function auth(req, res, next){
    
    if(req.session.user != undefined && req.session.user == process.env.MM){
        //console.log(req.session)
        next()
    }else{
        res.redirect('/')
    }

}

module.exports = auth;