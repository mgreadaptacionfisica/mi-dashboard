import initialClientes from './clientes'
import initialTeam from './team'

const store = {
  clients: [...initialClientes],
  team: {
    tecnico: [...initialTeam.tecnico],
    ventas: [...initialTeam.ventas],
  },
  addClient(client) {
    this.clients.unshift(client)
  },
  addTeamMember(member) {
    if (member.area === 'ventas') {
      this.team.ventas.unshift(member)
    } else {
      this.team.tecnico.unshift(member)
    }
  },
}

export default store;
