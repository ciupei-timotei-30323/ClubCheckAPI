
export function helloRoute(app){
    app.get('/hello',  () => {
        return {hello : "worlds"}
    })
}


