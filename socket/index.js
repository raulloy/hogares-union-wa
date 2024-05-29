import http from 'http';
import { Server } from 'socket.io';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import axios from 'axios';

const app = express();

const httpServer = http.Server(app);
const io = new Server(httpServer, { cors: { origin: '*' } });
