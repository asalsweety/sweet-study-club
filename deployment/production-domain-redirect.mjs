export default {
  fetch(request) {
    const destination = new URL(request.url)
    destination.protocol = 'https:'
    destination.host = 'sweetstudy.site'
    destination.port = ''
    return Response.redirect(destination, 302)
  },
}
