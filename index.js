"use strict"

var microfun = require('microfun')

module.exports = function (node, routes, channels)
{
  var model = {
    current: {
      component: null,
      path: '/',
      args: []
    },
    routes: categorize_routes(routes)
  }
  
  if (!channels)
  {
    channels = []
  }
  channels.push(location_change)
  
  microfun.mount(node, model, view, channels)
}

function view (model, signal)
{
  if (model.current.component)
  {
    return model.current.component.view(
      model[model.current.path],
      signal.map(model.current.path)
    )
  }
  else
  {
    return microfun.h('div')
  }
}

function categorize_routes (routes)
{
  var simple = {}
  var parameterized = []
  
  Object.keys(routes).forEach(function (path)
  {
    if (path == '*')
    {
      routes.default = routes[path]
    }
    else if (-1 < path.indexOf(':'))
    {
      parameterized.push(
        [parameterized_route_matcher(path), routes[path]]
      )
    }
    else
    {
      simple[path] = routes[path]
    }
  })
  
  return {
    simple: simple,
    parameterized: parameterized
  }
}

function parameterized_route_matcher (path)
{
  return new RegExp(path.replace(/(:[^\/]+)/g, '([^/]+)'))
}

function location_change (signal)
{
  var route_from_hash_signal = signal(route_from_hash.bind(null, signal))
  
  window.addEventListener('hashchange', function (e)
  {
    route_from_hash_signal(window.location.hash)
  })
  
  route_from_hash_signal(window.location.hash)
}

function route_from_hash (signal, model, hash)
{
  var path = "/"
  
  if (hash != "")
  {
    path = hash.substr(1)
  }
  
  var match = match_path(path, model.routes)
  if (!match)
  {
    throw new Error("No handler for route '"+path+"'")
  }
  
  if (model.current.component && model.current.component.exit)
  {
    model.current.component.onexit(model[path])
  }
  
  var init = match.component.init
  var init_args = [signal.map(path)].concat(match.args)
  var update = {}
  update[path] = init ? init.apply(null, init_args) : null
  update.current = match
  
  return Object.assign({}, model, update)
}

function match_path (path, routes)
{
  var component = routes.simple[path]
  
  if (component)
  {
    return {
      component: component,
      path: path,
      args: []
    }
  }
  else
  {
    var match = get_parameterized_route_match(path, routes.parameterized)
    if (match)
    {
      return match
    }
    else if (routes.default)
    {
      return {
        component: routes.default,
        path: path,
        args: []
      }
    }
  }
}

function get_parameterized_route_match (path, routes)
{
  var match = null
  
  routes.every(function (route)
  {
    var pattern = routes[0]
    var component = routes[1]
    var m = path.match(pattern)
    
    if (m)
    {
      match = {
        component: component,
        path: path,
        args: match.slice(1)
      }
      return false
    }
    
    return true
  })
  
  return match
}