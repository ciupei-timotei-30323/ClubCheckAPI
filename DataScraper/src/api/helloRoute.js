
export function helloRoute(app){
    app.get('/',  () => {
        return {hello : "worlds"}
    })
}


