# 🏦 DApp de Subasta (Auction)

Aplicación descentralizada que permite realizar **subastas inteligentes** sobre la blockchain.  
Los usuarios pueden **pujar**, **consultar el estado**, y **reclamar sus fondos** según el resultado.  
El administrador puede **iniciar**, **cerrar subastas** y **retirar los fondos**.

---

## 🚀 Características principales

- Contrato `Auction.sol` que gestiona:
  - Inicio de subastas con producto, precio base y tiempo límite.
  - Registro automático de pujas y pujador más alto.
  - Cierre automático o manual de subasta.
  - Devolución de fondos a los no ganadores.
  - Retiro de fondos por parte del admin.
- Interfaz en **React + React Bootstrap** con conexión a MetaMask.
- Manejo visual de alertas (éxito, error, sin ganador, etc).

---

## 🧱 Arquitectura del proyecto

```
blockchain-auction-dapp/
│
├── contracts/
│   ├── Auction.sol               # Contrato principal de subastas
│
├── src/
│   ├── contracts/                # Manifiestos ABI importados
│   ├── components/               # Componentes de interfaz
│   ├── pages/                    # Página principal de subastas
│   ├── App.js                    # Lógica general de interacción
│   └── index.js
│
├── package.json
└── README.md
```

---

## ⚙️ Instalación

### 1. Clonar el repositorio
```bash
git clone https://github.com/tuusuario/blockchain-auction-dapp.git
cd blockchain-auction-dapp
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar despliegue
Crea un archivo `.env`:
```
PRIVATE_KEY=tu_clave_privada
BSC_TESTNET_URL=https://data-seed-prebsc-1-s1.binance.org:8545/
```

---

## 💻 Ejecución del frontend

```bash
npm start
```

Accede a [http://localhost:3000](http://localhost:3000)  
MetaMask debe estar conectada a **BSC Testnet (Chain ID 97)**.

---

## 🔑 Flujo de uso

1. El **administrador** crea una subasta con producto, precio y duración.  
2. Los **usuarios** conectan su cartera y realizan pujas en tBNB.  
3. Al finalizar el tiempo:
   - Si hay ganador, se muestra su dirección.
   - Si no hay ganador, se muestra un mensaje en pantalla.
4. El admin puede retirar fondos de la subasta completada.

---

## 🧪 Tecnologías utilizadas

- Solidity 0.8.x  
- React 18 + Bootstrap  
- Ethers.js  
- MetaMask + detect-provider  
- BSC Testnet  

---

## 👨‍💻 Autor

Desarrollado por **JuanMa Sierra**  
Proyecto educativo dentro de *MU Blockchain Project*.
